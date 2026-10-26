const amqp = require('amqplib');
const fs = require('fs');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'survey_events';

// Heartbeat-Datei: Solange wir mit RabbitMQ verbunden sind, aktualisieren wir
// hier regelmäßig einen Zeitstempel. Der Docker-Healthcheck liest diese Datei
// und erkennt daran, ob der Consumer wirklich lebt - nicht nur, ob Node läuft.
const HEARTBEAT_FILE = '/tmp/logger-heartbeat';

let heartbeatTimer = null;
let reconnectScheduled = false;

function startHeartbeat() {
  const writeHeartbeat = () => {
    try {
      fs.writeFileSync(HEARTBEAT_FILE, String(Date.now()));
    } catch (error) {
      console.error('[Logger-Service] Heartbeat konnte nicht geschrieben werden:', error.message);
    }
  };
  writeHeartbeat();
  heartbeatTimer = setInterval(writeHeartbeat, 10000);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  // Datei löschen, damit der Healthcheck sofort "ungesund" meldet
  try {
    fs.rmSync(HEARTBEAT_FILE, { force: true });
  } catch (error) {
    // Datei war evtl. nicht vorhanden - unkritisch
  }
}

// Verbindung verloren oder Verbindungsaufbau fehlgeschlagen:
// Heartbeat stoppen und genau einen neuen Versuch in 5 Sekunden einplanen.
function scheduleReconnect() {
  stopHeartbeat();
  if (reconnectScheduled) return;
  reconnectScheduled = true;
  setTimeout(() => {
    reconnectScheduled = false;
    startLogger();
  }, 5000);
}

async function startLogger() {
  try {
    console.log('[Logger-Service] Verbinde mit RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);

    // Bei Verbindungsabbruch im laufenden Betrieb neu verbinden
    connection.on('error', (err) => {
      console.error('[Logger-Service] Verbindungsfehler:', err.message);
    });
    connection.on('close', () => {
      console.error('[Logger-Service] Verbindung geschlossen, neuer Versuch in 5 Sekunden...');
      scheduleReconnect();
    });

    const channel = await connection.createChannel();

    // Stellt sicher, dass die Warteschlange (Queue) existiert
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`[Logger-Service] Bereit! Warte auf Events in Queue "${QUEUE_NAME}"...`);

    // Lauscht dauerhaft auf neue Nachrichten in der Queue
    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        const eventData = JSON.parse(msg.content.toString());
        console.log(
          `[AUDIT-LOG] [${new Date().toISOString()}] Aktion: ${eventData.action} | Details:`,
          eventData.payload
        );

        // Bestätigt RabbitMQ, dass die Nachricht erfolgreich verarbeitet wurde
        channel.ack(msg);
      }
    });

    // Verbindung + Queue + Consumer stehen -> ab jetzt Heartbeat schreiben
    startHeartbeat();
  } catch (error) {
    console.error('[Logger-Service] Verbindungsfehler, neuer Versuch in 5 Sekunden...', error.message);
    scheduleReconnect();
  }
}

startLogger();
