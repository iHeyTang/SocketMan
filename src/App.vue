<script setup lang="ts">
import { ref, reactive } from 'vue';
import { CirclePlus } from '@element-plus/icons-vue';
import ConfigForm, { ConfigFormProps, ConfigFormRef, SocketManClientConfig, SocketManServerConfig } from './ConfigForm.vue';
import SocketServer, { SocketServerInst } from './SocketServer.vue';
import SocketClient, { SocketClientInst } from './SocketClient.vue';

const activeKey = ref<string>();

const instances = reactive<{ servers: Record<string, SocketServerInst>; clients: Record<string, SocketClientInst> }>({ servers: {}, clients: {} });

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
      <SocketServer v-if="activeKey && instances.servers[activeKey]?.config" :inst="instances.servers[activeKey]" :on-click-edit="handleEditServer" />
      <SocketClient v-if="activeKey && instances.clients[activeKey]?.config" :inst="instances.clients[activeKey]" :on-click-edit="handleEditClient" />
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
