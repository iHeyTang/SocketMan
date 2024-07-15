<script setup lang="ts">
import { ref } from 'vue';
import { WebsocketServer } from '..';
import { SocketManServerConfig } from './ConfigForm.vue';
import { autoScroll } from './utils';

type ServerLogType =
  | { type: 'message'; messageType: 'receive' | 'send' | 'broadcast'; clientKey: string; message: string }
  | { type: 'connection'; clientKey: string }
  | { type: 'disconnection'; clientKey: string }
  | { type: 'listen' }
  | { type: 'close' }
  | { type: 'error'; errMsg: string };

/**
 * 服务端实例
 */
export type SocketServerInst = {
  href: string;
  config: SocketManServerConfig;
  server?: WebsocketServer;
  info?: ReturnType<WebsocketServer['getInfo']>;
  logs: ServerLogType[];
};

export type SocketServerProps = {
  inst: SocketServerInst;
  onClickEdit: (id: string) => void;
};

const messageTypeHighlight: Record<ServerLogType['type'], string> = {
  message: 'blue',
  connection: 'green',
  disconnection: 'red',
  listen: 'purple',
  close: 'gray',
  error: 'red',
};

const props = defineProps<SocketServerProps>();

const infoTabKey = ref<'logs' | 'clients'>('logs');
const transmitterClientKeys = ref<string[]>([]);
const serverTextarea = ref('');

const handleStartServer = () => {
  const inst = props.inst;
  if (!inst) return;
  const server = window.ws.createWebSocketServer({ port: inst.config.port });
  inst.server = server;
  inst.info = server.getInfo();

  server.onError((err) => {
    inst.logs.push({ type: 'error', errMsg: err.message });
    autoScroll('serverLogsContainer');
  });

  server.onConnection((key) => {
    inst.info = server.getInfo();
    inst.logs.push({ type: 'connection', clientKey: key });
    autoScroll('serverLogsContainer');
  });

  server.onDisconnection(() => {
    inst.info = server.getInfo();
    inst.logs.push({ type: 'disconnection', clientKey: inst.config.id });
    autoScroll('serverLogsContainer');
  });

  server.onMessage((key, message) => {
    inst.logs.push({ type: 'message', messageType: 'receive', clientKey: key, message });
    autoScroll('serverLogsContainer');
  });

  server.onBroadcast((message) => {
    inst.logs.push({ type: 'message', messageType: 'broadcast', clientKey: '', message });
    autoScroll('serverLogsContainer');
  });

  server.onSend((key, message) => {
    inst.logs.push({ type: 'message', messageType: 'send', clientKey: key, message });
    autoScroll('serverLogsContainer');
  });

  server.onListen(() => {
    inst.logs.push({ type: 'listen' });
    autoScroll('serverLogsContainer');
  });

  server.onClose(() => {
    inst.logs.push({ type: 'close' });
    autoScroll('serverLogsContainer');
  });
};

const handleCloseServer = () => {
  const inst = props.inst;
  if (!inst) return;
  inst.server?.close();
  delete inst.info;
  delete inst.server;
};

const handlerServerSend = () => {
  const inst = props.inst;
  if (!inst) return;
  inst.server?.send(transmitterClientKeys.value, serverTextarea.value);
};
</script>

<template>
  <el-container>
    <el-header height="fit-content" style="text-align: start; padding: 16px 16px 0 16px">
      <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
        <div>
          <el-tag v-if="props.inst?.info?.listening" disable-transitions type="success" :style="{ fontWeight: 'bold' }">
            {{ props.inst?.config.name }}
          </el-tag>
          <el-tag v-if="!props.inst?.info?.listening" disable-transitions type="info" :style="{ fontWeight: 'bold' }">
            {{ props.inst?.config.name }}
          </el-tag>
          <div style="padding-left: 10px; font-size: 12px">{{ props.inst?.href }}</div>
        </div>
        <el-button-group v-if="!props.inst?.info?.listening">
          <el-button @click="props.onClickEdit?.(props.inst?.config.id)">配置</el-button>
        </el-button-group>
        <el-radio-group v-if="props.inst?.info?.listening" v-model="infoTabKey">
          <el-radio-button value="logs">Logs</el-radio-button>
          <el-radio-button value="clients">Clients</el-radio-button>
        </el-radio-group>
        <div>
          <el-button v-if="!props.inst?.info?.listening" @click="handleStartServer"> 启动 </el-button>
          <el-button v-if="props.inst?.info?.listening" @click="handleCloseServer"> 关闭 </el-button>
        </div>
      </div>
    </el-header>
    <el-main style="text-align: left">
      <el-card id="serverLogsContainer" v-if="infoTabKey === 'logs'" style="height: calc(100% - 4px); overflow: scroll">
        <div v-for="log of props.inst?.logs" style="margin-bottom: 8px">
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
        <div v-for="client of props.inst?.info?.clients" :label="client" :name="client">
          {{ client }}
        </div>
      </el-card>
    </el-main>
    <el-footer height="fit-content" style="margin-bottom: 12px">
      <div style="height: 100%">
        <el-select placeholder="请选择发送信息的目标客户端" :multiple="true" v-model="transmitterClientKeys">
          <el-option v-for="client of props.inst?.info?.clients" :key="client" :label="client" :value="client" />
        </el-select>
        <div style="display: flex; align-items: center; margin-top: 4px">
          <el-input v-model="serverTextarea" style="width: 100%" :rows="5" type="textarea" placeholder="Please input" resize="none" />
          <el-button style="height: fit-content; margin-left: 12px" @click="handlerServerSend">发送</el-button>
        </div>
      </div>
    </el-footer>
  </el-container>
</template>
