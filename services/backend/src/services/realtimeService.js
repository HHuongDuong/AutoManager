const jwt = require('jsonwebtoken');
const { WebSocketServer } = require('ws');

module.exports = function createRealtimeService(deps) {
  const { server, jwtSecret, getAllowedBranchIds } = deps;

  const wss = new WebSocketServer({ server, path: '/ws' });

  function publishRealtime(event, payload, branchId) {
    const data = JSON.stringify({ event, branch_id: branchId || null, payload });
    wss.clients.forEach(client => {
      if (client.readyState !== 1) return;
      if (client.allBranches) {
        client.send(data);
        return;
      }
      if (!branchId) {
        client.send(data);
        return;
      }
      if (client.branches?.includes(branchId)) client.send(data);
    });
  }

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      const branchId = url.searchParams.get('branch_id');
      if (!token) return ws.close(4401, 'unauthorized');
      const decoded = jwt.verify(token, jwtSecret);
      const permissions = decoded?.permissions || [];
      const allowed = permissions.includes('RBAC_MANAGE') ? [] : await getAllowedBranchIds(decoded.sub);
      if (!permissions.includes('RBAC_MANAGE') && allowed.length === 0) return ws.close(4403, 'forbidden');
      if (branchId && !permissions.includes('RBAC_MANAGE') && !allowed.includes(branchId)) return ws.close(4403, 'forbidden');
      ws.userId = decoded.sub;
      ws.allBranches = permissions.includes('RBAC_MANAGE');
      ws.branches = permissions.includes('RBAC_MANAGE') ? [] : allowed;
      ws.send(JSON.stringify({ event: 'ws.connected', branch_id: branchId || null }));
    } catch (err) {
      ws.close(4401, 'unauthorized');
    }
  });

  return { wss, publishRealtime };
};
