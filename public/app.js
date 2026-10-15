/**
 * DeskPulse - Client Application
 */

(function () {
  'use strict';

  const socket = io();

  let tickets = [];
  let currentFilter = 'all';
  let selectedTicket = null;

  // DOM Elements
  const ticketList = document.getElementById('ticketList');
  const countAll = document.getElementById('countAll');
  const noSelection = document.getElementById('noSelection');
  const activeThread = document.getElementById('activeThread');
  const thId = document.getElementById('thId');
  const thPriority = document.getElementById('thPriority');
  const thStatus = document.getElementById('thStatus');
  const thSlaCountdown = document.getElementById('thSlaCountdown');
  const thSubject = document.getElementById('thSubject');
  const thAvatar = document.getElementById('thAvatar');
  const thCustomerName = document.getElementById('thCustomerName');
  const thCustomerEmail = document.getElementById('thCustomerEmail');
  const messagesContainer = document.getElementById('messagesContainer');
  const replyInput = document.getElementById('replyInput');
  const statusSelect = document.getElementById('statusSelect');
  const btnSendReply = document.getElementById('btnSendReply');
  const btnNewTicket = document.getElementById('btnNewTicket');
  const toastContainer = document.getElementById('toastContainer');

  socket.on('tickets:init', (data) => {
    tickets = data || [];
    renderTickets();
    if (tickets.length > 0) selectTicket(tickets[0]);
  });

  socket.on('ticket:created', (t) => {
    tickets.unshift(t);
    renderTickets();
    showToast(`New ticket received: ${t.id}`);
  });

  socket.on('ticket:updated', (t) => {
    const idx = tickets.findIndex(x => x.id === t.id);
    if (idx !== -1) tickets[idx] = t;
    renderTickets();
    if (selectedTicket && selectedTicket.id === t.id) {
      selectTicket(t);
    }
  });

  function renderTickets() {
    countAll.textContent = tickets.length;
    const filtered = currentFilter === 'all' ? tickets : tickets.filter(x => x.status === currentFilter);

    ticketList.innerHTML = '';
    filtered.forEach(t => {
      const card = document.createElement('div');
      card.className = 't-card' + (selectedTicket && selectedTicket.id === t.id ? ' active' : '');
      card.innerHTML = `
        <div class="t-top">
          <span class="t-id">${t.id}</span>
          <span class="p-badge ${t.priority.toLowerCase()}">${t.priority}</span>
        </div>
        <div class="t-subject">${t.subject}</div>
        <div class="t-customer">
          <span>${t.customer}</span>
          <span style="color: var(--accent-cyan)">${t.status}</span>
        </div>
      `;
      card.addEventListener('click', () => selectTicket(t));
      ticketList.appendChild(card);
    });
  }

  function selectTicket(t) {
    selectedTicket = t;
    noSelection.style.display = 'none';
    activeThread.style.display = 'flex';

    thId.textContent = t.id;
    thPriority.textContent = t.priority;
    thPriority.className = 'p-badge ' + t.priority.toLowerCase();
    thStatus.textContent = t.status;
    thSubject.textContent = t.subject;
    thAvatar.textContent = t.customer.charAt(0).toUpperCase();
    thCustomerName.textContent = t.customer;
    thCustomerEmail.textContent = t.email;

    renderMessages(t.messages);
    updateSlaCountdown();

    document.querySelectorAll('.t-card').forEach((card, idx) => {
      card.classList.toggle('active', tickets[idx]?.id === t.id);
    });
  }

  function renderMessages(msgs) {
    messagesContainer.innerHTML = '';
    msgs.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg-bubble ' + m.sender;
      div.innerHTML = `
        <div>${m.text}</div>
        <span class="msg-time">${m.sender === 'agent' ? 'You' : selectedTicket.customer} &bull; ${m.time}</span>
      `;
      messagesContainer.appendChild(div);
    });
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  function updateSlaCountdown() {
    if (!selectedTicket) return;
    const elapsed = Date.now() - selectedTicket.createdAt;
    const remaining = Math.max(0, selectedTicket.slaTargetMs - elapsed);
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    thSlaCountdown.textContent = `${mins}m ${secs}s`;
    if (mins < 10) thSlaCountdown.style.color = '#EF4444';
  }
  setInterval(updateSlaCountdown, 1000);

  // Send Reply
  function handleSend() {
    const text = replyInput.value.trim();
    if (!text || !selectedTicket) return;
    socket.emit('ticket:reply', { ticketId: selectedTicket.id, text, sender: 'agent' });
    const newStatus = statusSelect.value;
    if (newStatus !== selectedTicket.status) {
      socket.emit('ticket:status', { ticketId: selectedTicket.id, status: newStatus });
    }
    replyInput.value = '';
    showToast('Reply dispatched to customer! 🚀');
  }

  btnSendReply.addEventListener('click', handleSend);
  replyInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Canned Responses
  document.querySelectorAll('.canned-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      replyInput.value = btn.dataset.text;
      replyInput.focus();
    });
  });

  // Filter Tabs
  document.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTickets();
    });
  });

  // New Ticket Simulation
  btnNewTicket.addEventListener('click', () => {
    const subjects = [
      "OAuth Refresh Token Expiring Prematurely",
      "WebSocket Mesh Reconnection Stalling on Safari iOS",
      "Rate Limit Quota Adjustment for Enterprise Endpoint",
      "Billing Invoice PDF Missing Tax Identifier"
    ];
    const names = ["Sarah Jenkins", "Liam O'Connor", "Devin Harris", "Priya Nair"];
    const priorities = ["Urgent", "High", "Medium"];

    const sub = subjects[Math.floor(Math.random() * subjects.length)];
    const name = names[Math.floor(Math.random() * names.length)];
    const p = priorities[Math.floor(Math.random() * priorities.length)];

    socket.emit('ticket:create', {
      subject: sub,
      customer: name,
      email: name.toLowerCase().replace(/\s+/g, '.') + '@clientcorp.io',
      priority: p,
      message: `Urgent inquiry regarding our production environment: ${sub}. Please advise.`
    });
  });

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    toastContainer.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

})();
