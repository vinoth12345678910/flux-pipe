import { publishEvent, getChannel } from '../../../packages/rabbitmq/src/index';
import { runWithTraceId } from '../../../packages/logger/src/index';
import { waitForMessage, purgeQueue } from '../../helpers/rabbitmq';

describe('event publisher', () => {
  const testExchange = 'test.events';
  const testQueue = 'test.bound.queue';
  const routingKey = 'test.org1.pipe1';

  beforeAll(async () => {
    const ch = await getChannel();
    await ch.assertExchange(testExchange, 'topic', { durable: true });
    await ch.assertQueue(testQueue, { durable: true });
    await ch.bindQueue(testQueue, testExchange, 'test.#');
  });

  afterAll(async () => {
    const ch = await getChannel();
    try {
      await ch.unbindQueue(testQueue, testExchange, 'test.#');
      await ch.deleteQueue(testQueue);
      await ch.deleteExchange(testExchange);
    } catch (err) {
      // Ignore
    }
  });

  beforeEach(async () => {
    await purgeQueue(testQueue);
  });

  it('publishes message and it arrives on bound queue', async () => {
    const payload = { hello: 'world' };
    await publishEvent(testExchange, routingKey, payload);

    const received = await waitForMessage(testQueue);
    expect(received.content).toEqual(payload);
  });

  it('message is persistent (deliveryMode=2)', async () => {
    const payload = { persistent: true };
    await publishEvent(testExchange, routingKey, payload);

    const received = await waitForMessage(testQueue);
    expect(received.properties.deliveryMode).toBe(2);
  });

  it('traceId from AsyncLocalStorage is in message headers', async () => {
    const payload = { trace: 'test' };
    const traceId = 'trace-abc';

    await runWithTraceId(traceId, async () => {
      await publishEvent(testExchange, routingKey, payload);
    });

    const received = await waitForMessage(testQueue);
    expect(received.properties.headers?.traceId).toBe(traceId);
  });

  it('publishing to non-existent exchange throws', async () => {
    await expect(
      publishEvent('non.existent.exchange', 'key', { foo: 'bar' })
    ).rejects.toThrow();
  });
});
