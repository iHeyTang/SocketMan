<script setup lang="ts">
import { ref, reactive } from 'vue'
import { CirclePlus } from '@element-plus/icons-vue'
import type { WebsocketServer } from '..';

/**
 * 服务端配置
 */
type SocketManServerConfig = {
  // 唯一标识符
  id: string;
  // 名称，用于展示
  name: string;
  // 简单描述
  description: string;
  // 使用协议
  protocol: string;
  // 端口号
  port: number;
}

/**
 * 客户端配置
 */
type SocketManClientConfig = {
  // 唯一标识符
  id: string;
  // 名称，用于展示
  name: string;
  // 简单描述
  description: string;
  // 使用协议
  protocol: string;
  // 域名
  serverHost: string;
  // 端口号
  serverPort: number;
}


type LogType =
  | { type: 'message', messageType: 'receive' | 'send' | 'broadcast', clientKey: string, message: string }
  | { type: 'connection', clientKey: string }
  | { type: 'disconnection', clientKey: string }
  | { type: 'listen' }
  | { type: 'close' }

/**
 * 服务端实例
 */
type SocketServer = {
  href: string;
  config: SocketManServerConfig;
  server?: WebsocketServer;
  info?: ReturnType<WebsocketServer['getInfo']>;
  logs: (LogType)[];
}

/**
 * 客户端实例
 */
type SocketClient = {
  href: string;
  config: SocketManClientConfig;
  socket?: WebSocket;
}

const messageTypeHighlight: Record<LogType['type'], string> = {
  message: 'blue',
  connection: 'green',
  disconnection: 'red',
  listen: 'purple',
  close: 'gray',
}


const addDialogVisible = ref(false);
const addType = ref<'server' | 'client'>('server')

const infoTabKey = ref<'logs' | 'clients'>('logs')

const transmitterClientKeys = ref<string[]>([])
const textarea = ref('')

const activeKey = ref<string>()

const instances = reactive<{ servers: Record<string, SocketServer>, clients: Record<string, SocketClient> }>({ servers: {}, clients: {} })

const addServerForm = reactive<SocketManServerConfig>({
  id: '',
  name: "ws://localhost:9290",
  description: '',
  protocol: 'ws',
  port: 9290,
})
const addClientForm = reactive<SocketManClientConfig>({
  id: '',
  name: "ws://localhost:9290",
  description: '',
  protocol: 'ws',
  serverHost: 'localhost',
  serverPort: 9290,
})

const handleAddCommit = () => {
  const id = Date.now().toString()
  if (addType.value === 'server') {
    instances.servers[id] = {
      href: `ws://localhost:${addServerForm.port}`,
      config: { ...addServerForm, id },
      logs: [],
    }
  } else {
    instances.clients[id] = {
      href: `ws://${addClientForm.serverHost}:${addClientForm.serverPort}`,
      config: { ...addClientForm, id },
    }
  }
  addDialogVisible.value = false
}

const handleStartServer = (id: string) => {
  const inst = instances.servers[id]
  if (!inst) return
  const server = window.ws.createWebSocketServer({ port: inst.config.port });
  instances.servers[id].server = server;
  instances.servers[id].info = server.getInfo();


  server.onConnection((key) => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.info = server.getInfo()
    inst.logs.push({ type: 'connection', clientKey: key })
  })

  server.onDisconnection(() => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.info = server.getInfo()
  })

  server.onMessage((key, message) => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.logs.push({ type: 'message', messageType: 'receive', clientKey: key, message })
    const logsContainer = document.getElementById('logsContainer');
    if (logsContainer) {
      setTimeout(() => {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      }, 0)
    }
  })

  server.onBroadcast((message) => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.logs.push({ type: 'message', messageType: 'broadcast', clientKey: '', message })
  })

  server.onSend((key, message) => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.logs.push({ type: 'message', messageType: 'send', clientKey: key, message })
  })

  server.onListen(() => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.logs.push({ type: 'listen' })
  })

  server.onClose(() => {
    const inst = instances.servers[id];
    if (!inst) return
    inst.logs.push({ type: 'close' })
  })
}

const handleCloseServer = (id: string) => {
  instances.servers[id].server?.close()
  delete instances.servers[id].info;
  delete instances.servers[id].server;
}

const handlerSend = () => {
  const inst = activeKey.value ? instances.servers[activeKey.value] : undefined
  if (!inst) return
  inst.server?.send(transmitterClientKeys.value, textarea.value)
}

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
            <el-menu-item v-for="inst in Object.values(instances.servers)" :key="inst.config.id" :index="inst.config.id"
              @click="activeKey = inst.config.id">
              {{ inst.config.name }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="clients">
            <template #title>
              <span>客户端</span>
            </template>
            <el-menu-item v-for="inst in Object.values(instances.clients)" :key="inst.config.id" :index="inst.config.id"
              @click="activeKey = inst.config.id">
              {{ inst.config.name }}
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
        <div
          :style="{ position: 'absolute', left: 0, bottom: 0, padding: '20px', width: '160px', display: 'flex', justifyContent: 'center' }">
          <el-button @click="addDialogVisible = true" :icon="CirclePlus" :style="{ width: '100%' }">
            添加
          </el-button>
        </div>
      </el-aside>
      <el-container v-if="activeKey && instances.servers[activeKey]?.config">
        <el-header height="fit-content" style="text-align: start; padding: 16px 16px 0 16px">
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }">
            <div>
              <div :style="{ fontWeight: 'bold' }">{{ instances.servers[activeKey].config.name }}</div>
              <div>({{ instances.servers[activeKey].href }})</div>
              <div>{{ instances.servers[activeKey].config.description }}</div>
            </div>
            <el-radio-group v-if="instances.servers[activeKey].info?.listening" v-model="infoTabKey">
              <el-radio-button value="logs">Logs</el-radio-button>
              <el-radio-button value="clients">Clients</el-radio-button>
            </el-radio-group>
            <div>
              <el-button v-if="!instances.servers[activeKey].info?.listening"
                @click="handleStartServer(instances.servers[activeKey].config.id)">
                启动
              </el-button>
              <el-button v-if="instances.servers[activeKey].info?.listening"
                @click="handleCloseServer(instances.servers[activeKey].config.id)">
                关闭
              </el-button>
            </div>
          </div>
        </el-header>
        <el-main style="text-align: left;" v-if="activeKey">
          <el-card id="logsContainer" v-if="infoTabKey === 'logs'" style="height: calc(100% - 4px); overflow: scroll;">
            <div v-for="log of instances.servers[activeKey].logs" style="margin-bottom: 8px;">
              <div :style="{ color: messageTypeHighlight[log.type], width: '100%', whiteSpace: 'wrap' }">
                <el-space>
                  <div>{{ log.type }}</div>
                  <div v-if="log.type === 'message'">{{ log.messageType }}</div>
                  <div v-if="log.type === 'message'">{{ log.clientKey }}</div>
                </el-space>
              </div>
              <div v-if="log.type === 'message'" style="white-space: pre-wrap;word-wrap: break-word;">{{ log.message }}
              </div>
              <div v-if="log.type === 'connection'">{{ log.clientKey }}</div>
              <div v-if="log.type === 'disconnection'">{{ log.clientKey }}</div>
            </div>
          </el-card>
          <el-card v-if="infoTabKey === 'clients'" style="height: calc(100% - 4px); overflow: scroll;">
            <div v-for="client of instances.servers[activeKey].info?.clients" :label="client" :name="client">
              {{ client }}
            </div>
          </el-card>
        </el-main>
        <el-footer height="fit-content" style="margin-bottom: 12px">
          <div style="height: 100%;">
            <el-select placeholder="请选择发送信息的目标客户端" :multiple="true" v-model="transmitterClientKeys">
              <el-option v-for="client of instances.servers[activeKey].info?.clients" :key="client" :label="client"
                :value="client" />
            </el-select>
            <div style="display: flex; align-items: center; margin-top: 4px; ">
              <el-input v-model="textarea" style="width: 100%;" :rows="5" type="textarea" placeholder="Please input"
                resize="none" />
              <el-button style="height: fit-content; margin-left: 12px;" @click="handlerSend">发送</el-button>
            </div>
          </div>
        </el-footer>
      </el-container>
    </el-container>
  </div>
  <el-dialog v-model="addDialogVisible" title="Configuration" width="500">
    <el-tabs v-model="addType">
      <el-tab-pane label="Server" name="server">
        <el-form :model="addServerForm" label-width="auto" style="max-width: 600px">
          <el-form-item label="Name">
            <el-input v-model="addServerForm.name" />
          </el-form-item>
          <el-form-item label="Description">
            <el-input v-model="addServerForm.description" />
          </el-form-item>
          <el-form-item label="Port">
            <el-input v-model="addServerForm.port" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
      <el-tab-pane label="Client" name="client">
        <el-form :model="addClientForm" label-width="auto" style="max-width: 600px">
          <el-form-item label="Name">
            <el-input v-model="addClientForm.name" />
          </el-form-item>
          <el-form-item label="Description">
            <el-input v-model="addClientForm.description" />
          </el-form-item>
          <el-form-item label="Server Host">
            <el-input v-model="addClientForm.serverHost" />
          </el-form-item>
          <el-form-item label="Server Port">
            <el-input v-model="addClientForm.serverPort" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddCommit">
          添加
        </el-button>
      </div>
    </template>
  </el-dialog>
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
