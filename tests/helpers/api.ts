import request from 'supertest';

export function createClient(baseUrl: string, accessToken?: string) {
  const agent = request(baseUrl);
  
  if (accessToken) {
    // Return a modified agent or use a wrapper that automatically adds Authorization headers
    // Actually, supertest's request method returns a Test object. We can extend request.
    // A clean way is to wrap request to intercept and inject headers.
    return new Proxy(agent, {
      get(target, propKey, receiver) {
        const origMethod = (target as any)[propKey];
        if (typeof origMethod === 'function') {
          return function (...args: any[]) {
            const req = origMethod.apply(target, args);
            if (req && typeof req.set === 'function') {
              return req.set('Authorization', `Bearer ${accessToken}`);
            }
            return req;
          };
        }
        return Reflect.get(target, propKey, receiver);
      }
    });
  }

  return agent;
}

export const clients = {
  management: 'http://localhost:3001',
  ingestion: 'http://localhost:3002',
  delivery: 'http://localhost:3004',
};
