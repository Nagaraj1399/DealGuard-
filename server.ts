import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './server/db.ts';
import { classifyMessage } from './server/classifier.ts';
import { issueNexconnToken } from './server/nexconn.ts';
import { generateBriefingWav, saveAudio, getAudio } from './server/audio.ts';
import type { Message, Escalation } from './server/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use('/src/assets', express.static(path.resolve(__dirname, 'src/assets')));

// API Routes

// 1. Issue Nexconn Token
app.post('/api/nexconn/token', async (req, res) => {
  try {
    const { userId, name, portraitUri } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    const tokenResult = await issueNexconnToken({ userId, name, portraitUri });
    res.json(tokenResult);
  } catch (err: any) {
    console.error('Error issuing Nexconn token:', err);
    res.status(500).json({ error: err.message || 'Token issuance failed' });
  }
});

// 2. Listings
app.get('/api/listings', (req, res) => {
  const listings = db.getListings();
  res.json(listings);
});

app.get('/api/listings/:id', (req, res) => {
  const listing = db.getListing(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }
  res.json(listing);
});

// 3. Users
app.get('/api/users', (req, res) => {
  res.json(db.getUsers());
});

// 4. Messages for a channel
app.get('/api/channels/:channelId/messages', (req, res) => {
  const { channelId } = req.params;
  const messages = db.getMessages(channelId);
  res.json(messages);
});

// 5. Send message + Guardian Copilot Real-Time AI Pipeline
app.post('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const { channelId } = req.params;
    const { senderId, senderName, senderRole, content, listingId } = req.body;

    if (!content || !senderId) {
      return res.status(400).json({ error: 'Missing content or senderId' });
    }

    const listing = listingId ? db.getListing(listingId) : db.getListings()[0];
    const previousMessages = db.getMessages(channelId);

    // Run Guardian Copilot Real LLM Classifier (fail-safe so chat send never breaks)
    let classification = {
      trust_flag: false,
      trust_reason: null as string | null,
      lead_score: 50,
      risk_of_loss: 20,
    };
    try {
      classification = await classifyMessage(
        content,
        previousMessages.map((m) => ({
          senderName: m.senderName,
          senderRole: m.senderRole,
          content: m.content,
        })),
        senderRole || 'buyer'
      );
    } catch (classifyErr) {
      console.warn('Classifier failed, sending message unclassified:', classifyErr);
    }

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newMessage: Message = {
      id: messageId,
      channelId,
      senderId,
      senderName: senderName || 'User',
      senderRole: senderRole || 'buyer',
      content,
      timestamp: Date.now(),
      classification,
      trustFlag: classification.trust_flag,
      trustReason: classification.trust_reason,
      leadScore: classification.lead_score,
      riskOfLoss: classification.risk_of_loss,
    };

    db.addMessage(newMessage);

    let escalationEvent: Escalation | null = null;
    let escalationDeduplicated = false;

    // Check if Escalation threshold met (lead_score >= 80 OR risk_of_loss >= 80)
    if (classification.lead_score >= 80 || classification.risk_of_loss >= 80) {
      const now = Date.now();
      const isRisk = classification.risk_of_loss >= 80;
      const existingActive = db.getActiveEscalationForChannel(channelId);
      const escalationId = existingActive ? existingActive.id : `esc_${now}`;
      escalationDeduplicated = Boolean(existingActive);

      const triggerReason =
        classification.lead_score >= 80 && classification.risk_of_loss >= 80
          ? 'both'
          : classification.risk_of_loss >= 80
          ? 'risk_of_loss'
          : 'lead_score';

      // (a) Single deduplicated system message in buyer-seller channel
      const systemNoticeText = isRisk
        ? 'Connecting you with a senior DealGuard broker specialist to review priority viewings and terms…'
        : 'Connecting you with a DealGuard escrow partner to prepare reservation documentation…';

      db.upsertSystemNotice(channelId, escalationId, systemNoticeText);

      // (b) Generate one-paragraph spoken briefing for agent
      const propertyTitle = listing ? listing.title : 'Marina Residence';
      const propertyPrice = listing ? listing.formattedPrice : '$1.28M';

      const briefingTranscript = isRisk
        ? `Guardian Escalation Briefing: High walkaway risk detected for buyer ${senderName || 'Alex Chen'} on ${propertyTitle} (${propertyPrice}). Buyer stated: "${content}". Risk of loss is currently ${classification.risk_of_loss}%. Recommend immediate intervention: call buyer directly with priority weekend schedule access.`
        : `Guardian Escalation Briefing: High-intent commitment detected for buyer ${senderName || 'Alex Chen'} on ${propertyTitle} (${propertyPrice}). Lead readiness score is ${classification.lead_score}%. Buyer expressed: "${content}". Recommend immediate human follow-up to coordinate contract deposit and escrow packet.`;

      // (c) Synthesize audio WAV buffer gracefully (escalation still succeeds if audio fails)
      let audioUrl = '';
      try {
        const audioBuffer = generateBriefingWav(briefingTranscript);
        const baseAudioUrl = saveAudio(escalationId, audioBuffer);
        audioUrl = `${baseAudioUrl}?v=${now}`;
      } catch (audioErr) {
        console.warn('Audio synthesis failed, posting text-only escalation:', audioErr);
      }

      // (d) Upsert single active escalation record for this channel
      escalationEvent = {
        id: escalationId,
        channelId,
        listingId: listing ? listing.id : 'listing_1',
        listingTitle: propertyTitle,
        buyerId: senderRole === 'buyer' ? senderId : existingActive?.buyerId || 'buyer_alex',
        buyerName: senderRole === 'buyer' ? senderName : existingActive?.buyerName || 'Alex Chen',
        sellerId: listing ? listing.sellerId : 'seller_priya',
        sellerName: listing ? listing.sellerName : 'Priya Patel',
        triggerReason,
        leadScore: classification.lead_score,
        riskOfLoss: classification.risk_of_loss,
        briefingTranscript,
        audioUrl,
        timestamp: now,
        status: 'active',
        lastMessageText: content,
      };
      db.addEscalation(escalationEvent);

      // Upsert single voice card in Agent Group Channel
      const agentVoiceMsg: Message = {
        id: `agent_voice_${now}`,
        channelId: 'channel_agent_group',
        senderId: 'guardian_copilot',
        senderName: 'Guardian Copilot',
        senderRole: 'system',
        content: `🚨 Proactive Escalation: ${propertyTitle} · ${isRisk ? 'Disengagement Alert' : 'Hot Closing Lead'}`,
        timestamp: now + 100,
        isEscalated: true,
        escalationId,
        audioBriefingUrl: audioUrl || undefined,
        audioTranscript: briefingTranscript,
        leadScore: classification.lead_score,
        riskOfLoss: classification.risk_of_loss,
      };
      db.upsertAgentVoiceMessage(escalationId, agentVoiceMsg);
    }

    res.json({
      message: newMessage,
      classification,
      escalation: escalationEvent,
      deduplicated: escalationDeduplicated,
    });
  } catch (err: any) {
    console.error('Error posting message:', err);
    res.status(500).json({ error: err.message || 'Failed to process message' });
  }
});

// 6. Direct classification endpoint
app.post('/api/copilot/classify', async (req, res) => {
  try {
    const { message, history, senderRole } = req.body;
    const result = await classifyMessage(message || '', history || [], senderRole);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Direct manual escalate endpoint (deduplicated per active channel)
app.post('/api/copilot/escalate', (req, res) => {
  try {
    const { channelId, listingId, buyerName, buyerMessage } = req.body;
    const now = Date.now();
    const resolvedChannelId = channelId || 'channel_alex_priya';
    const existingActive = db.getActiveEscalationForChannel(resolvedChannelId);
    const escalationId = existingActive ? existingActive.id : `esc_${now}`;
    const listing = listingId ? db.getListing(listingId) : db.getListings()[0];
    const propertyTitle = listing ? listing.title : 'The Horizon Marina Residence';

    const transcript = `Guardian Escalation Briefing: Manual inspection trigger for ${buyerName || 'Buyer'} on ${propertyTitle}. Last message: "${buyerMessage || 'High urgency buyer enquiry'}". Recommended action: connect via direct voice line.`;
    let audioUrl = '';
    try {
      const audioBuffer = generateBriefingWav(transcript);
      const baseAudioUrl = saveAudio(escalationId, audioBuffer);
      audioUrl = `${baseAudioUrl}?v=${now}`;
    } catch (audioErr) {
      console.warn('Audio synthesis failed on manual escalation:', audioErr);
    }

    const esc: Escalation = {
      id: escalationId,
      channelId: resolvedChannelId,
      listingId: listing ? listing.id : listingId || 'listing_1',
      listingTitle: propertyTitle,
      buyerId: 'buyer_alex',
      buyerName: buyerName || 'Alex Chen',
      sellerId: listing ? listing.sellerId : 'seller_priya',
      sellerName: listing ? listing.sellerName : 'Priya Patel',
      triggerReason: 'risk_of_loss',
      leadScore: 35,
      riskOfLoss: 92,
      briefingTranscript: transcript,
      audioUrl,
      timestamp: now,
      status: 'active',
      lastMessageText: buyerMessage || 'ok nvm I will look elsewhere',
    };

    db.addEscalation(esc);
    res.json(esc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Agent escalations queue
app.get('/api/agent/escalations', (req, res) => {
  const escalations = db.getEscalations();
  res.json(escalations);
});

// 9. Agent takeover
app.post('/api/agent/takeover', (req, res) => {
  try {
    const { escalationId, channelId, agentId, agentName } = req.body;
    if (escalationId) {
      db.claimEscalation(escalationId, agentName || 'Sarah Jenkins');
    }

    const takeoverMsg: Message = {
      id: `agent_join_${Date.now()}`,
      channelId: channelId || 'channel_alex_priya',
      senderId: agentId || 'agent_sarah',
      senderName: agentName || 'Sarah Jenkins (Senior Broker)',
      senderRole: 'agent',
      content: `Hello! Sarah Jenkins here, Senior Broker Lead with DealGuard. I've joined the chat to ensure you get seamless priority access for Saturday's private showing. How can I best assist with your timing?`,
      timestamp: Date.now(),
    };

    db.addMessage(takeoverMsg);
    res.json({ success: true, message: takeoverMsg });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Reset seed endpoint
app.post('/api/seed/reset', (req, res) => {
  db.resetToDefaults();
  res.json({ success: true, message: 'Database reset to default seed state' });
});

// 11. Stream audio briefing WAV with full HTTP Range (206 Partial Content) support
app.get('/api/audio/:id.wav', (req, res) => {
  const id = req.params.id;
  let buffer = getAudio(id);

  if (!buffer) {
    // Regenerate from matching escalation transcript if available and cache so byte ranges stay identical
    const matchingEsc = db.getEscalations().find((e) => e.id === id);
    const transcript =
      matchingEsc?.briefingTranscript ||
      'Guardian Copilot voice briefing transmission initialized.';
    buffer = generateBriefingWav(transcript);
    saveAudio(id, buffer);
  }

  const total = buffer.length;
  const rangeHeader = req.headers.range;

  res.setHeader('Content-Type', 'audio/wav');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (!match) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }

    const startStr = match[1];
    const endStr = match[2];

    let start: number;
    let end: number;

    if (startStr === '' && endStr !== '') {
      // Suffix byte range: bytes=-500
      const suffixLength = parseInt(endStr, 10);
      if (isNaN(suffixLength) || suffixLength <= 0) {
        res.setHeader('Content-Range', `bytes */${total}`);
        return res.status(416).end();
      }
      start = Math.max(0, total - suffixLength);
      end = total - 1;
    } else {
      start = startStr === '' ? 0 : parseInt(startStr, 10);
      end = endStr === '' ? total - 1 : Math.min(total - 1, parseInt(endStr, 10));
    }

    if (isNaN(start) || isNaN(end) || start < 0 || start >= total || start > end) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }

    const chunk = buffer.subarray(start, end + 1);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${total}`);
    res.setHeader('Content-Length', chunk.length);
    return res.status(206).end(chunk);
  }

  res.setHeader('Content-Length', total);
  res.status(200).end(buffer);
});

// Mount Vite or static serving
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🛡️  DealGuard server running at http://localhost:${PORT}`);
  });
}

startServer();
