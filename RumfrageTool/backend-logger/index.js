const amqp = require('amqplib');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const QUEUE_NAME = 'survey_events';

async function startLogger() {
  try {
    console.log('[Logger-Service] Verbinde mit RabbitMQ...');
    const connection = await amqp.connect(RABBITMQ_URL);
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
  } catch (error) {
    console.error('[Logger-Service] Verbindungsfehler, neuer Versuch in 5 Sekunden...', error.message);
    setTimeout(startLogger, 5000);
  }
}

startLogger();