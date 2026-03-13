<template>
  <div class="page">
    <el-container>
      <el-header height="60px" class="app-header">
        <el-button @click="$router.push('/admin/dashboard')">← 返回看板</el-button>
        <span class="title">作业管理</span>
        <div class="header-actions">
          <el-button type="success" @click="exportAllGradesCSV">导出全部成绩 CSV</el-button>
          <el-button type="primary" @click="openCreate">+ 新建作业</el-button>
        </div>
      </el-header>
      <el-main>
        <el-table :data="assignments" v-loading="loading" style="width:100%">
          <el-table-column prop="id" label="ID" width="60" />
          <el-table-column prop="title" label="作业名称" min-width="200" />
          <el-table-column label="截止时间" width="180">
            <template #default="{ row }">{{ formatDate(row.deadline) }}</template>
          </el-table-column>
          <el-table-column label="允许迟交" width="100">
            <template #default="{ row }">
              <el-tag :type="row.allow_late ? 'success' : 'danger'" size="small">
                {{ row.allow_late ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="file_rules" label="文件规则" min-width="150" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button size="small" @click="openEdit(row)">编辑</el-button>
              <el-button
                size="small"
                type="info"
                @click="$router.push(`/admin/assignments/${row.id}/submissions`)"
              >查看提交</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-main>
    </el-container>

    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑作业' : '新建作业'" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="作业名称" required>
          <el-input v-model="form.title" placeholder="请输入作业名称" />
        </el-form-item>
        <el-form-item label="作业说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="可选" />
        </el-form-item>
        <el-form-item label="截止时间" required>
          <el-date-picker
            v-model="form.deadline"
            type="datetime"
            placeholder="选择截止日期时间"
            style="width:100%"
          />
        </el-form-item>
        <el-form-item label="允许迟交">
          <el-switch v-model="form.allow_late" />
        </el-form-item>
        <el-form-item label="允许格式">
          <el-checkbox-group v-model="selectedFormats">
            <el-checkbox label=".pdf">PDF</el-checkbox>
            <el-checkbox label=".docx">Word</el-checkbox>
            <el-checkbox label=".md">Markdown</el-checkbox>
            <el-checkbox label=".txt">文本</el-checkbox>
            <el-checkbox label=".ipynb">Jupyter Notebook</el-checkbox>
            <el-checkbox label=".py">Python</el-checkbox>
            <el-checkbox label=".zip">压缩包</el-checkbox>
          </el-checkbox-group>
          <el-input 
            v-model="form.file_rules" 
            placeholder="或手动输入，逗号分隔" 
            style="margin-top:8px"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveAssignment">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import api from '@/utils/api'

const router = useRouter()
const assignments = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingId = ref(null)
const form = reactive({ title: '', description: '', deadline: null, allow_late: false, file_rules: '' })
const selectedFormats = ref(['.pdf', '.docx', '.md', '.txt', '.ipynb', '.py', '.zip'])

// 监听勾选变化，自动更新 file_rules
watch(selectedFormats, (newVal) => {
  if (newVal.length > 0) {
    form.file_rules = newVal.join(',')
  }
}, { deep: true })

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('zh-CN')
}

function openCreate() {
  editingId.value = null
  Object.assign(form, { title: '', description: '', deadline: null, allow_late: false, file_rules: '.pdf,.docx,.md,.txt,.ipynb,.py,.zip' })
  selectedFormats.value = ['.pdf', '.docx', '.md', '.txt', '.ipynb', '.py', '.zip']
  dialogVisible.value = true
}

function openEdit(row) {
  editingId.value = row.id
  Object.assign(form, {
    title: row.title,
    description: row.description || '',
    deadline: row.deadline ? new Date(row.deadline) : null,
    allow_late: row.allow_late,
    file_rules: row.file_rules || ''
  })
  // 解析已有的 file_rules 设置到勾选框
  if (row.file_rules) {
    selectedFormats.value = row.file_rules.split(',').map(s => s.trim())
  } else {
    selectedFormats.value = []
  }
  dialogVisible.value = true
}

async function saveAssignment() {
  if (!form.title || !form.deadline) {
    ElMessage.warning('请填写作业名称和截止时间')
    return
  }
  saving.value = true
  try {
    const payload = {
      title: form.title,
      description: form.description,
      deadline: form.deadline instanceof Date ? form.deadline.toISOString() : form.deadline,
      allow_late: form.allow_late,
      file_rules: form.file_rules
    }
    if (editingId.value) {
      await api.put(`/admin/assignments/${editingId.value}`, payload)
      ElMessage.success('修改成功')
    } else {
      await api.post('/admin/assignments', payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadAssignments()
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '保存失败')
  } finally {
    saving.value = false
  }
}

async function exportAllGradesCSV() {
  try {
    const res = await api.get('/admin/export_all_grades_csv', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'all_grades.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('CSV 导出成功')
  } catch (e) {
    ElMessage.error(e.response?.data?.detail || '导出失败')
  }
}

async function loadAssignments() {
  loading.value = true
  try {
    const res = await api.get('/admin/assignments')
    assignments.value = res.data
  } catch {
    ElMessage.error('加载作业列表失败')
  } finally {
    loading.value = false
  }
.header-actions {
  display: flex;
  gap: 10px;
}
}

onMounted(loadAssignments)
</script>

<style scoped>
.page { min-height: 100vh; background: #f5f7fa; }
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 20px;
}
.title { font-size: 18px; font-weight: 600; color: #303133; }
</style>
