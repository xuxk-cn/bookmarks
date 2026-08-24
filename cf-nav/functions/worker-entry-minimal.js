/**
 * 最小 worker 测试
 */
export default {
  async fetch(request, env) {
    return new Response('Hello from minimal worker!', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};