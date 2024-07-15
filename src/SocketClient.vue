<script setup lang="ts">
import { ref } from 'vue';
import { SocketManClientConfig } from './ConfigForm.vue';
import { autoScroll } from './utils';

type ClientLogType =
  | { type: 'message'; messageType: 'receive' | 'send'; message: string }
  | { type: 'connection'; id: string }
  | { type: 'disconnection'; id: string; reason: string }
  | { type: 'error' };

/**
 * 客户端实例
 */
export type SocketClientInst = {
  href: string;
  config: SocketManClientConfig;
  socket?: WebSocket;
  info?: { readyState: WebSocket['readyState'] };
  logs: ClientLogType[];
};

type SocketClientProps = {
  inst: SocketClientInst;
  onClickEdit: (id: string) => void;
};

const messageTypeHighlight: Record<ClientLogType['type'], string> = {
  message: 'blue',
  connection: 'green',
  disconnection: 'red',
  error: 'red',
};

const props = defineProps<SocketClientProps>();

const clientTextarea = ref('');

const handleStartClient = () => {
  const inst = props.inst;
  if (!inst) return;
  const socket = new WebSocket(inst.href);
  inst.socket = socket;

  socket.onerror = () => {
    inst.logs.push({ type: 'error' });
    autoScroll('clientLogsContainer');
  };

  socket.onopen = () => {
    inst.logs.push({ type: 'connection', id: inst.config.id });
    autoScroll('clientLogsContainer');
    inst.info = { ...(inst.info || {}), readyState: socket.readyState };
  };

  socket.onclose = (e) => {
    inst.logs.push({ type: 'disconnection', id: inst.config.id, reason: e.reason || 'Unknown reason' });
    autoScroll('clientLogsContainer');
    inst.info = { ...(inst.info || {}), readyState: socket.readyState };
  };

  socket.onmessage = (event) => {
    inst.logs.push({ type: 'message', messageType: 'receive', message: event.data });
    autoScroll('clientLogsContainer');
  };
};

const handleCloseClient = () => {
  const inst = props.inst;
  inst.socket?.close();
  inst.info = undefined;
  delete inst.socket;
  inst.logs.push({ type: 'disconnection', id: inst.config.id, reason: '客户端主动关闭' });
  autoScroll('clientLogsContainer');
};

const handlerClientSend = () => {
  const inst = props.inst;
  if (!inst) return;
  inst.socket?.send(clientTextarea.value);
  inst.logs.push({ type: 'message', messageType: 'send', message: clientTextarea.value });
  autoScroll('clientLogsContainer');
};
</script>

<template>
  <el-container>
    <el-header height="fit-content" style="text-align: start; padding: 16px 16px 0 16px">
      <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }">
        <div>
          <el-tag v-if="props.inst?.info?.readyState === 1" disable-transitions type="success" :style="{ fontWeight: 'bold' }">
            {{ props.inst?.config.name }}
          </el-tag>
          <el-tag v-if="props.inst?.info?.readyState !== 1" disable-transitions type="info" :style="{ fontWeight: 'bold' }">
            {{ props.inst?.config.name }}
          </el-tag>
          <div style="padding-left: 10px; font-size: 12px">{{ props.inst?.href }}</div>
        </div>
        <el-button-group v-if="props.inst?.info?.readyState !== 1">
          <el-button @click="props.onClickEdit?.(props.inst?.config.id)">配置</el-button>
        </el-button-group>
        <div>
          <el-button v-if="props.inst?.info?.readyState !== 1" @click="handleStartClient"> 启动 </el-button>
          <el-button v-if="props.inst?.info?.readyState === 1" @click="handleCloseClient"> 关闭 </el-button>
        </div>
      </div>
    </el-header>
    <el-main style="text-align: left">
      <el-card id="clientLogsContainer" style="height: calc(100% - 4px); overflow: scroll">
        <div v-for="log of props.inst?.logs" style="margin-bottom: 8px">
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
</template>
