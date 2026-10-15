const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Seed Initial Tickets
let tickets = [
  {
    id: "TCK-1082",
    subject: "Stripe Webhook Signature Verification Failing in Production",
    customer: "Elena Rostova",
    email: "elena@acme-saas.com",
    priority: "Urgent",
    status: "Open",
    createdAt: Date.now() - 1000 * 60 * 18,
    slaTargetMs: 1000 * 60 * 45, // 45 min SLA
    assignedAgent: "Sahil Chauhan",
    messages: [
      { sender: "customer", text: "Hey team, getting 400 Bad Request on webhook callbacks since our deployment 15 mins ago. Urgent help needed!", time: "18 mins ago" }
    ]
  },
  {
    id: "TCK-1083",
    subject: "Custom Domain SSL Certificate Provisioning Pending",
    customer: "David Chen",
    email: "david@fintech-edge.io",
    priority: "High",
    status: "In Progress",
    createdAt: Date.now() - 1000 * 60 * 35,
    slaTargetMs: 1000 * 60 * 60,
    assignedAgent: "Sahil Chauhan",
    messages: [
      { sender: "customer", text: "Our DNS records were updated with CNAME over 3 hours ago but status is still pending validation.", time: "35 mins ago" },
      { sender: "agent", text: "Looking into the Let's Encrypt challenge verification logs now, David.", time: "20 mins ago" }
    ]
  },
  {
    id: "TCK-1084",
    subject: "Requesting Multi-Tenant WhatsApp Gateway Documentation",
    customer: "Marcus Vance",
    email: "marcus@vancecloud.net",
    priority: "Medium",
    status: "Open",
    createdAt: Date.now() - 1000 * 60 * 5,
    slaTargetMs: 1000 * 60 * 90,
    assignedAgent: "Unassigned",
    messages: [
      { sender: "customer", text: "Hi! We want to connect 5 support reps to a single central number. Is zero-leak isolation supported?", time: "5 mins ago" }
    ]
  }
];

io.on('connection', (socket) => {
  // Send initial ticket list
  socket.emit('tickets:init', tickets);

  // New ticket created
  socket.on('ticket:create', (newTicket) => {
    const ticket = {
      id: "TCK-" + Math.floor(1000 + Math.random() * 9000),
      subject: newTicket.subject || "General Inquiry",
      customer: newTicket.customer || "Anonymous User",
      email: newTicket.email || "client@company.com",
      priority: newTicket.priority || "Medium",
      status: "Open",
      createdAt: Date.now(),
      slaTargetMs: (newTicket.priority === 'Urgent' ? 30 : 60) * 60 * 1000,
      assignedAgent: "Sahil Chauhan",
      messages: [{ sender: "customer", text: newTicket.message, time: "Just now" }]
    };
    tickets.unshift(ticket);
    io.emit('ticket:created', ticket);
  });

  // Reply to ticket
  socket.on('ticket:reply', ({ ticketId, text, sender }) => {
    const t = tickets.find(item => item.id === ticketId);
    if (t) {
      const msg = { sender: sender || "agent", text, time: "Just now" };
      t.messages.push(msg);
      if (t.status === 'Open') t.status = 'In Progress';
      io.emit('ticket:updated', t);
    }
  });

  // Update status (Open / In Progress / Resolved)
  socket.on('ticket:status', ({ ticketId, status }) => {
    const t = tickets.find(item => item.id === ticketId);
    if (t) {
      t.status = status;
      io.emit('ticket:updated', t);
    }
  });
});

const PORT = process.env.PORT || 5250;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`  🚀 DeskPulse Support Desk on port ${PORT}`);
  console.log(`  🌐 Local URL: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
