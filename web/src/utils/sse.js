import { sJson, euid } from './string.js'

const sseWeb = {
  clients: new Map(),
  connections: new Set(),
  Recv(id, fn){
    // 挂载方法到某一个 sse 路径
    // 允许多次挂载不同的函数（相同函数请勿多次挂载
    let target = this.clients.get(id);
    if (target) {
      target.add(fn);
    } else {
      target = new Set([fn]);
      this.clients.set(id, target);
    }
    if (this.connections.has(id)) {
      console.debug('server-sent events:', id, 'connected');
    } else {
      const sse_new = new EventSource('/sse/elecV2P/' + id);
      sse_new.onmessage = (event)=>{
        let data = sJson(event.data);
        let target = this.clients.get(id);
        if (target) {
          target.forEach(fn=>fn(data));
        } else {
          console.debug('no sse method for:', id, event.data);
        }
      }
      sse_new.onerror = (error)=>{
        sse_new.close();
        // 删除连接信息，保留添加的方法
        this.connections.delete(id);
        console.error('sse close', error);
      }
      this.connections.add(id);
    }
  }
}

export { sseWeb }