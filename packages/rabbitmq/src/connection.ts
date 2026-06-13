import amqp, { ChannelModel, Channel } from "amqplib";

let model: ChannelModel | null = null;
let channel: Channel | null = null;

let closedIntentionally = false;

export async function getConnection(): Promise<ChannelModel> {
  if (!model) {
    closedIntentionally = false;
    model = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost:5672");
    model.on("close", () => {
      model = null;
      channel = null;
    });
    model.on("error", () => {
      model = null;
      channel = null;
    });
  }
  return model;
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    const conn = await getConnection();
    channel = await conn.createChannel();
    channel.on("close", () => {
      channel = null;
    });
    channel.on("error", () => {
      channel = null;
    });
  }
  return channel;
}

export async function disconnect(): Promise<void> {
  closedIntentionally = true;
  try {
    if (channel) await channel.close();
    if (model) await model.close();
  } finally {
    channel = null;
    model = null;
  }
}

export function isClosedIntentionally(): boolean {
  return closedIntentionally;
}
