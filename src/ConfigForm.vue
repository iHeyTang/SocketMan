<script setup lang="ts">
import { reactive, ref } from 'vue';

type FormMode = 'add' | 'edit';
type FormType = 'server' | 'client';

/**
 * 服务端配置
 */
export type SocketManServerConfig = {
  // 唯一标识符
  id: string;
  // 名称，用于展示
  name: string;
  // 使用协议
  protocol: string;
  // 端口号
  port: string;
};

/**
 * 客户端配置
 */
export type SocketManClientConfig = {
  // 唯一标识符
  id: string;
  // 名称，用于展示
  name: string;
  // 链接的服务器地址
  uri: string;
};
export type ConfigFormRef = {
  show: <T extends FormType>(params: {
    mode: FormMode;
    type: T;
    initValues?: T extends 'server' ? SocketManServerConfig : SocketManClientConfig;
  }) => void;
};

export type ConfigFormProps = {
  handleAddCommit: <T extends FormType>(data: {
    mode: FormMode;
    type: T;
    formValue: T extends 'server' ? SocketManServerConfig : SocketManClientConfig;
  }) => void;
};

// 定义外部传入的props
const props = defineProps<ConfigFormProps>();

const mode = ref<FormMode>('add');
const type = ref<FormType>('server');
const visible = ref<boolean>(false);

const addServerForm = reactive<SocketManServerConfig>({
  id: '',
  name: 'ws://localhost:9290',
  protocol: 'ws',
  port: '9290',
});
const addClientForm = reactive<SocketManClientConfig>({
  id: '',
  name: 'ws://localhost:9290',
  uri: 'ws://localhost:9290/ws',
});

defineExpose<ConfigFormRef>({
  show: (params) => {
    mode.value = params.mode;
    type.value = params.type;
    if (params.initValues) {
      if (params.type === 'server') {
        Object.assign(addServerForm, params.initValues);
      } else {
        Object.assign(addClientForm, params.initValues);
      }
    }
    visible.value = true;
  },
});
</script>

<template>
  <el-dialog v-model="visible" title="Configurations" width="500">
    <el-tabs v-model="type">
      <el-tab-pane label="Server" name="server">
        <el-form :model="addServerForm" label-width="auto" style="max-width: 600px">
          <el-form-item label="Name">
            <el-input v-model="addServerForm.name" />
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
          <el-form-item label="Uri">
            <el-input v-model="addClientForm.uri" />
          </el-form-item>
        </el-form>
      </el-tab-pane>
    </el-tabs>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button
          type="primary"
          @click="
            props.handleAddCommit({ mode, type, formValue: type === 'server' ? addServerForm : addClientForm });
            visible = false;
          "
          >保存</el-button
        >
      </div>
    </template>
  </el-dialog>
</template>
