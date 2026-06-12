import amqp, { ChannelModel, Channel } from "amqplib";

let model: ChannelModel | null = null;
let channel: Channel | null = null;

export async function getConnection(): Promise<ChannelModel> {
  if (!model) {
    model = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost:5672");
  }
  return model;
}

export async function getChannel(): Promise<Channel> {
  if (!channel) {
    const conn = await getConnection();
    channel = await conn.createChannel();
  }
  return channel;
}

export async function disconnect(): Promise<void> {
  try {
    if (channel) await channel.close();
    if (model) await model.close();
  } finally {
    channel = null;
    model = null;
  }
}
