<template>
  <div>
    <h1>User Administration</h1>

    <!-- Create User Form -->
    <form @submit.prevent="createUser">
      <h2>Create User</h2>
      <input v-model="newUser.username" placeholder="Username" required />
      <input v-model="newUser.password" type="password" placeholder="Password" required />
      <input v-model="newUser.email" type="email" placeholder="Email" />
      <input v-model="newUser.avatar" placeholder="Avatar URL" />
      <input v-model="newUser.color" placeholder="Color" />
      <button type="submit">Create</button>
    </form>

    <!-- Users Table -->
    <h2>Users</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Username</th>
          <th>Email</th>
          <th>Avatar</th>
          <th>Color</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>
            <input v-if="editingUserId === user.id" v-model="editingUser.username" />
            <span v-else>{{ user.username }}</span>
          </td>
          <td>
            <input v-if="editingUserId === user.id" v-model="editingUser.email" />
            <span v-else>{{ user.email }}</span>
          </td>
          <td>
            <input v-if="editingUserId === user.id" v-model="editingUser.avatar" />
            <span v-else>{{ user.avatar }}</span>
          </td>
          <td>
            <input v-if="editingUserId === user.id" v-model="editingUser.color" />
            <span v-else>{{ user.color }}</span>
          </td>
          <td>
            <div v-if="editingUserId === user.id">
              <button @click="updateUser(user.id)">Save</button>
              <button @click="cancelEdit">Cancel</button>
            </div>
            <div v-else>
              <button @click="startEdit(user)">Edit</button>
              <button @click="deleteUser(user.id)">Delete</button>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const users = ref([]);
const newUser = ref({
  username: '',
  password: '',
  email: '',
  avatar: '',
  color: '',
});
const editingUserId = ref(null);
const editingUser = ref({});

const API_URL = 'http://localhost:3000/api/user-admin';

const fetchUsers = async () => {
  try {
    const response = await axios.get(API_URL);
    users.value = response.data;
  } catch (error) {
    console.error('Error fetching users:', error);
  }
};

const createUser = async () => {
  try {
    await axios.post(API_URL, newUser.value);
    newUser.value = { username: '', password: '', email: '', avatar: '', color: '' };
    fetchUsers();
  } catch (error) {
    console.error('Error creating user:', error);
  }
};

const startEdit = (user) => {
  editingUserId.value = user.id;
  editingUser.value = { ...user };
};

const cancelEdit = () => {
  editingUserId.value = null;
  editingUser.value = {};
};

const updateUser = async (id) => {
  try {
    await axios.put(`${API_URL}/${id}`, editingUser.value);
    editingUserId.value = null;
    editingUser.value = {};
    fetchUsers();
  } catch (error) {
    console.error('Error updating user:', error);
  }
};

const deleteUser = async (id) => {
  try {
    await axios.delete(`${API_URL}/${id}`);
    fetchUsers();
  } catch (error) {
    console.error('Error deleting user:', error);
  }
};

onMounted(fetchUsers);
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  border: 1px solid #ddd;
  padding: 8px;
}
th {
  background-color: #f2f2f2;
}
</style>