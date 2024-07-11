<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
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

type SocketServer = {
  href: string;
  config: SocketManServerConfig;
  server: WebsocketServer;
}

type SocketClient = {
  href: string;
  config: SocketManClientConfig;
  socket: WebSocket;
}


const addDialogVisible = ref(false);
const addType = ref<'server' | 'client'>('server')

const activeKey = ref()

const socketServerConfigs = reactive<SocketManServerConfig[]>([]);
const socketClientConfigs = reactive<SocketManClientConfig[]>([]);

const socketServers: Record<string, WebsocketServer> = {}
const socketClients: Record<string, WebSocket> = {}


const activeSocketServer = computed<SocketServer | undefined>(() => {
  if (!activeKey.value) return
  const config = socketServerConfigs.find(server => server.id === activeKey.value)
  if (config) {
    return {
      href: `${config.protocol}://localhost:${config.port}`,
      config: config,
      server: socketServers[config.id]
    }
  }
})

const activeSocketClient = computed<SocketClient | undefined>(() => {
  if (!activeKey.value) return
  const config = socketClientConfigs.find(client => client.id === activeKey.value)
  if (config) {
    return {
      href: `${config.protocol}://${config.serverHost}:${config.serverPort}`,
      config: config,
      socket: socketClients[config.id]
    }
  }
})


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
    socketServerConfigs.push({ ...addServerForm, id })
  } else {
    socketClientConfigs.push({ ...addClientForm, id })
  }
  addDialogVisible.value = false
}

const handleStartServer = (id: string) => {
  const config = socketServerConfigs.find(server => server.id === id)
  if (!config) return
  const server = window.ws.createWebSocketServer({ port: config.port });

  server.onConnection((key) => {
    server.send(key, `hello! ${key}`)
  })

  server.onMessage((key, message) => {
    server.send(key, `response for ${message}`)
  })

  socketServers[config.id] = server
}

</script>

<template>
  <div class="common-layout">
    <el-container style="height: 100vh">
      <el-aside width="200px" style="height: 100vh">
        <el-menu :default-openeds="['servers', 'clients']" style="height: 100%">
          <el-sub-menu index="servers">
            <template #title>
              <span>服务端</span>
            </template>
            <el-menu-item v-for="server in socketServerConfigs" :key="server.id" :index="server.id"
              @click="activeKey = server.id">
              {{ server.name }}
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="clients">
            <template #title>
              <span>客户端</span>
            </template>
            <el-menu-item v-for="client in socketClientConfigs" :key="client.id" :index="client.id"
              @click="activeKey = client.id">
              {{ client.name }}
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
      <el-main :style="{ textAlign: 'left', }">
        <div v-if="activeSocketServer?.config">
          <div :style="{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0px 16px' }">
            <div>
              <div :style="{ fontWeight: 'bold' }">{{ activeSocketServer.config.name }}</div>
              <div>({{ activeSocketServer.href }})</div>
              <div>{{ activeSocketServer.config.description }}</div>
            </div>
            <div>
              <el-button @click="handleStartServer(activeSocketServer.config.id)">启动</el-button>
            </div>
          </div>
          <el-divider />
        </div>
        <div v-if="activeSocketClient?.config">
          <div :style="{ fontWeight: 'bold' }">{{ activeSocketClient.config.name }}</div>
          <div>({{ activeSocketClient.href }})</div>
          <div>{{ activeSocketClient.config.description }}</div>
          <el-divider />
        </div>
      </el-main>
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
    </el-container>
  </div>

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
