<script setup lang="ts">
import { ref, reactive } from 'vue';
import { CirclePlus } from '@element-plus/icons-vue';
import type { WebsocketServer } from '..';
import ConfigForm, { ConfigFormProps, ConfigFormRef, SocketManClientConfig, SocketManServerConfig } from './ConfigForm.vue';

type ServerLogType =
  | { type: 'message'; messageType: 'receive' | 'send' | 'broadcast'; clientKey: string; message: string }
  | { type: 'connection'; clientKey: string }
  | { type: 'disconnection'; clientKey: string }
  | { type: 'listen' }
  | { type: 'close' }
  | { type: 'error'; errMsg: string };

type ClientLogType =
  | { type: 'message'; messageType: 'receive' | 'send'; message: string }
  | { type: 'connection'; id: string }
  | { type: 'disconnection'; id: string; reason: string }
  | { type: 'error' };

/**
 * 服务端实例
 */
type SocketServer = {
  href: string;
  config: SocketManServerConfig;
  server?: WebsocketServer;
  info?: ReturnType<WebsocketServer['getInfo']>;
  logs: ServerLogType[];
};

/**
 * 客户端实例
 */
type SocketClient = {
  href: string;
  config: SocketManClientConfig;
  socket?: WebSocket;
  info?: { readyState: WebSocket['readyState'] };
  logs: ClientLogType[];
};

const messageTypeHighlight: Record<ServerLogType['type'], string> = {
  message: 'blue',
  connection: 'green',
  disconnection: 'red',
  listen: 'purple',
  close: 'gray',
  error: 'red',
};

const infoTabKey = ref<'logs' | 'clients'>('logs');

const transmitterClientKeys = ref<string[]>([]);

const serverTextarea = ref('');
const clientTextarea = ref('');

const activeKey = ref<string>();

const instances = reactive<{ servers: Record<string, SocketServer>; clients: Record<string, SocketClient> }>({ servers: {}, clients: {} });

const configFormRef = ref<ConfigFormRef | null>(null);

const handleAddCommit: ConfigFormProps['handleAddCommit'] = (data) => {
  if (data.mode === 'add') {
    const id = Date.now().toString();
    if (data.type === 'server') {
      const formValue = data.formValue as SocketManServerConfig;
      instances.servers[id] = {
        href: `ws://localhost:${formValue.port}`,
        config: { ...formValue, id },
        logs: [],
      };
    } else if (data.type === 'client') {
      const formValue = data.formValue as SocketManClientConfig;
      instances.clients[id] = {
        href: formValue.uri,
        config: { ...formValue, id },
        logs: [],
      };
    }
  } else {
    if (data.type === 'server') {
      const formValue = data.formValue as SocketManServerConfig;
      instances.servers[formValue.id].config = { ...formValue } as SocketManServerConfig;
      instances.servers[formValue.id].href = `ws://localhost:${formValue.port}`;
    } else if (data.type === 'client') {
      const formValue = data.formValue as SocketManClientConfig;
      instances.clients[formValue.id].config = { ...formValue };
      instances.clients[formValue.id].href = formValue.uri;
    }
  }
};

const autoScroll = (eleId: string) => {
  const logsContainer = document.getElementById(eleId);
  // 在最底端或内容没有充满屏幕时进行自动滚动
  if (
    logsContainer &&
    (logsContainer.scrollHeight === logsContainer.scrollTop ||
      logsContainer.scrollHeight - logsContainer.scrollTop < logsContainer.clientHeight + 100)
  ) {
    setTimeout(() => {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }, 0);
  }
};

const handleStartServer = (id: string) => {
  const inst = instances.servers[id];
  if (!inst) return;
  const server = window.ws.createWebSocketServer({ port: inst.config.port });
  instances.servers[id].server = server;
  instances.servers[id].info = server.getInfo();

  server.onError((err) => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.logs.push({ type: 'error', errMsg: err.message });
    autoScroll('serverLogsContainer');
  });

  server.onConnection((key) => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.info = server.getInfo();
    inst.logs.push({ type: 'connection', clientKey: key });
    autoScroll('serverLogsContainer');
  });

  server.onDisconnection(() => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.info = server.getInfo();
    inst.logs.push({ type: 'disconnection', clientKey: id });
    autoScroll('serverLogsContainer');
  });

  server.onMessage((key, message) => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.logs.push({ type: 'message', messageType: 'receive', clientKey: key, message });
    autoScroll('serverLogsContainer');
  });

  server.onBroadcast((message) => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.logs.push({ type: 'message', messageType: 'broadcast', clientKey: '', message });
    autoScroll('serverLogsContainer');
  });

  server.onSend((key, message) => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.logs.push({ type: 'message', messageType: 'send', clientKey: key, message });
    autoScroll('serverLogsContainer');
  });

  server.onListen(() => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.logs.push({ type: 'listen' });
    autoScroll('serverLogsContainer');
  });

  server.onClose(() => {
    const inst = instances.servers[id];
    if (!inst) return;
    inst.logs.push({ type: 'close' });
    autoScroll('serverLogsContainer');
  });
};

const handleCloseServer = (id: string) => {
  instances.servers[id].server?.close();
  delete instances.servers[id].info;
  delete instances.servers[id].server;
};

const handlerServerSend = () => {
  const inst = activeKey.value ? instances.servers[activeKey.value] : undefined;
  if (!inst) return;
  inst.server?.send(transmitterClientKeys.value, serverTextarea.value);
};

const handleStartClient = (id: string) => {
  const inst = instances.clients[id];
  if (!inst) return;
  const socket = new WebSocket(inst.href);
  instances.clients[id].socket = socket;

  socket.onerror = () => {
    inst.logs.push({ type: 'error' });
    autoScroll('clientLogsContainer');
  };

  socket.onopen = () => {
    inst.logs.push({ type: 'connection', id });
    autoScroll('clientLogsContainer');
    inst.info = { ...(inst.info || {}), readyState: socket.readyState };
  };

  socket.onclose = (e) => {
    inst.logs.push({ type: 'disconnection', id, reason: e.reason || 'Unknown reason' });
    autoScroll('clientLogsContainer');
    inst.info = { ...(inst.info || {}), readyState: socket.readyState };
  };

  socket.onmessage = (event) => {
    inst.logs.push({ type: 'message', messageType: 'receive', message: event.data });
    autoScroll('clientLogsContainer');
  };
};

const handleCloseClient = (id: string) => {
  const inst = instances.clients[id];
  inst.socket?.close();
  inst.info = undefined;
  delete instances.clients[id].socket;
  inst.logs.push({ type: 'disconnection', id, reason: '客户端主动关闭' });
  autoScroll('clientLogsContainer');
};

const handlerClientSend = () => {
  const inst = activeKey.value ? instances.clients[activeKey.value] : undefined;
  if (!inst) return;
  inst.socket?.send(clientTextarea.value);
  inst.logs.push({ type: 'message', messageType: 'send', message: clientTextarea.value });
  autoScroll('clientLogsContainer');
};

const handleEditServer = (id: string) => {
  const inst = instances.servers[id];
  if (!inst) return;
  configFormRef.value?.show({ mode: 'edit', type: 'server', initValues: inst.config });
};

const handleEditClient = (id: string) => {
  const inst = instances.clients[id];
  if (!inst) return;
  configFormRef.value?.show({ mode: 'edit', type: 'client', initValues: inst.config });
};
</script>

<template>
  <div class="common-layout">
    <el-container style="height: 100vh">
      <el-aside width="200px" style="height: 100%">
        <el-menu :default-openeds="['servers', 'clients']" style="height: 100%">
          <el-sub-menu index="servers">
            <template #title>
              <span>服务端</span>
            </template>
            <el-menu-item
              v-for="inst in Object.values(instances.servers)"
              :key="inst.config.id"
              :index="inst.config.id"
              @click="activeKey = inst.config.id"
            >
              {{ inst.config.name }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="clients">
            <template #title>
              <span>客户端</span>
            </template>
            <el-menu-item
              v-for="inst in Object.values(instances.clients)"
              :key="inst.config.id"
              :index="inst.config.id"
              @click="activeKey = inst.config.id"
            >
              {{ inst.config.name }}
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
        <div :style="{ position: 'absolute', left: 0, bottom: 0, padding: '20px', width: '160px', display: 'flex', justifyContent: 'center' }">
          <el-button @click="configFormRef?.show({ mode: 'add', type: 'server' })" :icon="CirclePlus" :style="{ width: '100%' }"> 添加 </el-button>
        </div>
      </el-aside>
      <el-container v-if="activeKey && instances.servers[activeKey]?.config">
        <el-header height="fit-content" style="text-align: start; padding: 16px 16px 0 16px">
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
            <div>
              <el-tag v-if="instances.servers[activeKey].info?.listening" disable-transitions type="success" :style="{ fontWeight: 'bold' }">
                {{ instances.servers[activeKey].config.name }}
              </el-tag>
              <el-tag v-if="!instances.servers[activeKey].info?.listening" disable-transitions type="info" :style="{ fontWeight: 'bold' }">
                {{ instances.servers[activeKey].config.name }}
              </el-tag>
              <div style="padding-left: 10px; font-size: 12px">{{ instances.servers[activeKey].href }}</div>
            </div>
            <el-button-group v-if="!instances.servers[activeKey].info?.listening">
              <el-button @click="handleEditServer(instances.servers[activeKey].config.id)">配置</el-button>
            </el-button-group>
            <el-radio-group v-if="instances.servers[activeKey].info?.listening" v-model="infoTabKey">
              <el-radio-button value="logs">Logs</el-radio-button>
              <el-radio-button value="clients">Clients</el-radio-button>
            </el-radio-group>
            <div>
              <el-button v-if="!instances.servers[activeKey].info?.listening" @click="handleStartServer(instances.servers[activeKey].config.id)">
                启动
              </el-button>
              <el-button v-if="instances.servers[activeKey].info?.listening" @click="handleCloseServer(instances.servers[activeKey].config.id)">
                关闭
              </el-button>
            </div>
          </div>
        </el-header>
        <el-main style="text-align: left">
          <el-card id="serverLogsContainer" v-if="infoTabKey === 'logs'" style="height: calc(100% - 4px); overflow: scroll">
            <div v-for="log of instances.servers[activeKey].logs" style="margin-bottom: 8px">
              <div :style="{ color: messageTypeHighlight[log.type], width: '100%', whiteSpace: 'wrap' }">
                <el-space>
                  <div>{{ log.type }}</div>
                  <div v-if="log.type === 'message'">{{ log.messageType }}</div>
                  <div v-if="log.type === 'message'">{{ log.clientKey }}</div>
                </el-space>
              </div>
              <div v-if="log.type === 'message'" style="white-space: pre-wrap; word-wrap: break-word">{{ log.message }}</div>
              <div v-if="log.type === 'connection'">{{ log.clientKey }}</div>
              <div v-if="log.type === 'disconnection'">{{ log.clientKey }}</div>
              <div v-if="log.type === 'error'">{{ log.errMsg }}</div>
            </div>
          </el-card>
          <el-card v-if="infoTabKey === 'clients'" style="height: calc(100% - 4px); overflow: scroll">
            <div v-for="client of instances.servers[activeKey].info?.clients" :label="client" :name="client">
              {{ client }}
            </div>
          </el-card>
        </el-main>
        <el-footer height="fit-content" style="margin-bottom: 12px">
          <div style="height: 100%">
            <el-select placeholder="请选择发送信息的目标客户端" :multiple="true" v-model="transmitterClientKeys">
              <el-option v-for="client of instances.servers[activeKey].info?.clients" :key="client" :label="client" :value="client" />
            </el-select>
            <div style="display: flex; align-items: center; margin-top: 4px">
              <el-input v-model="serverTextarea" style="width: 100%" :rows="5" type="textarea" placeholder="Please input" resize="none" />
              <el-button style="height: fit-content; margin-left: 12px" @click="handlerServerSend">发送</el-button>
            </div>
          </div>
        </el-footer>
      </el-container>
      <el-container v-if="activeKey && instances.clients[activeKey]?.config">
        <el-header height="fit-content" style="text-align: start; padding: 16px 16px 0 16px">
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
            <div>
              <el-tag v-if="instances.clients[activeKey].info?.readyState === 1" disable-transitions type="success" :style="{ fontWeight: 'bold' }">
                {{ instances.clients[activeKey].config.name }}
              </el-tag>
              <el-tag v-if="instances.clients[activeKey].info?.readyState !== 1" disable-transitions type="info" :style="{ fontWeight: 'bold' }">
                {{ instances.clients[activeKey].config.name }}
              </el-tag>
              <div style="padding-left: 10px; font-size: 12px">{{ instances.clients[activeKey].href }}</div>
            </div>
            <el-button-group v-if="instances.clients[activeKey].info?.readyState !== 1">
              <el-button @click="handleEditClient(instances.clients[activeKey].config.id)">配置</el-button>
            </el-button-group>
            <div>
              <el-button
                v-if="instances.clients[activeKey].info?.readyState !== 1"
                @click="handleStartClient(instances.clients[activeKey].config.id)"
              >
                启动
              </el-button>
              <el-button
                v-if="instances.clients[activeKey].info?.readyState === 1"
                @click="handleCloseClient(instances.clients[activeKey].config.id)"
              >
                关闭
              </el-button>
            </div>
          </div>
        </el-header>
        <el-main style="text-align: left" v-if="activeKey && instances.clients[activeKey]">
          <el-card id="clientLogsContainer" style="height: calc(100% - 4px); overflow: scroll">
            <div v-for="log of instances.clients[activeKey].logs" style="margin-bottom: 8px">
              <div :style="{ color: messageTypeHighlight[log.type], width: '100%', whiteSpace: 'wrap' }">
                <el-space>
                  <div>{{ log.type }}</div>
                  <div v-if="log.type === 'message'">{{ log.messageType }}</div>
                </el-space>
              </div>
              <div v-if="log.type === 'message'" style="white-space: pre-wrap; word-wrap: break-word">{{ log.message }}</div>
              <div v-if="log.type === 'connection'">{{ log.id }}</div>
              <div v-if="log.type === 'disconnection'">{{ log.id }} {{ log.reason }}</div>
            </div>
          </el-card>
        </el-main>
        <el-footer height="fit-content" style="margin-bottom: 12px">
          <div style="height: 100%">
            <div style="display: flex; align-items: center; margin-top: 4px">
              <el-input v-model="clientTextarea" style="width: 100%" :rows="5" type="textarea" placeholder="Please input" resize="none" />
              <el-button style="height: fit-content; margin-left: 12px" @click="handlerClientSend">发送</el-button>
            </div>
          </div>
        </el-footer>
      </el-container>
    </el-container>
  </div>
  <ConfigForm ref="configFormRef" :handle-add-commit="handleAddCommit" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
