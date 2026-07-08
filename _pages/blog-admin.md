---
layout: page
title: Blog Management
permalink: /blog-admin/
nav: false
hidden: true
---

<div id="login-section">
  <div class="row justify-content-center">
    <div class="col-md-6">
      <div class="card">
        <div class="card-body">
          <h3 class="card-title text-center">Blog Management</h3>
          <p class="text-center text-muted">Enter password to access hidden posts</p>
          <div class="mb-3">
            <input type="password" id="admin-password" class="form-control" placeholder="Enter password">
          </div>
          <button class="btn btn-primary w-100" onclick="checkPassword()">Login</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div id="admin-panel" style="display: none;">
  <div class="row">
    <div class="col-12">
      <h2>Blog Management Panel</h2>
      <p class="text-muted">Manage your blog posts including hidden ones</p>

      <div class="row mb-4">
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5>Statistics</h5>
            </div>
            <div class="card-body">
              <p><strong>Total Posts:</strong> <span id="total-posts">0</span></p>
              <p><strong>Visible Posts:</strong> <span id="visible-posts">0</span></p>
              <p><strong>Hidden Posts:</strong> <span id="hidden-posts">0</span></p>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card">
            <div class="card-header">
              <h5>Quick Actions</h5>
            </div>
            <div class="card-body">
              <button class="btn btn-outline-primary btn-sm" onclick="exportPostList()">Export List</button>
              <button class="btn btn-outline-danger btn-sm" onclick="logout()">Logout</button>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h5>All Posts</h5>
        </div>
        <div class="card-body">
          <div class="table-responsive">
            <table class="table table-striped">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Tags</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody id="posts-table">
                <!-- Posts will be populated here -->
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<script>
// Simple password protection (you can change this password)
const ADMIN_PASSWORD = 'admin123';

// Store posts data
let allPosts = [];

function checkPassword() {
  const password = document.getElementById('admin-password').value;
  if (password === ADMIN_PASSWORD) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    loadPosts();
  } else {
    alert('Incorrect password');
  }
}

function loadPosts() {
  // Get all posts from Jekyll's site.posts
  {% for post in site.posts %}
    allPosts.push({
      title: "{{ post.title | escape }}",
      date: "{{ post.date | date: '%Y-%m-%d' }}",
      hidden: {{ post.hidden | default: false }},
      tags: [{% for tag in post.tags %}"{{ tag }}"{% unless forloop.last %}, {% endunless %}{% endfor %}],
      url: "{{ post.url | relative_url }}"
    });
  {% endfor %}
  
  updateStatistics();
  renderPostsTable();
}

function updateStatistics() {
  const total = allPosts.length;
  const hidden = allPosts.filter(post => post.hidden).length;
  const visible = total - hidden;
  
  document.getElementById('total-posts').textContent = total;
  document.getElementById('visible-posts').textContent = visible;
  document.getElementById('hidden-posts').textContent = hidden;
}

function renderPostsTable() {
  const tbody = document.getElementById('posts-table');
  tbody.innerHTML = '';
  allPosts.forEach((post, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${post.title}</td>
      <td>${post.date}</td>
      <td>
        <span class="badge ${post.hidden ? 'bg-warning' : 'bg-success'}">
          ${post.hidden ? 'Hidden' : 'Visible'}
        </span>
      </td>
      <td>${post.tags.map(tag => `<span class="badge bg-light text-dark me-1">${tag}</span>`).join('')}</td>
      <td><a href="${post.url}" target="_blank">View</a></td>
    `;
    tbody.appendChild(row);
  });
}

function exportPostList() {
  const csv = [
    'Title,Date,Hidden,Tags,URL',
    ...allPosts.map(post => [
      `"${post.title}"`,
      post.date,
      post.hidden,
      `"${post.tags.join(',')}"`,
      post.url
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blog-posts.csv';
  a.click();
  window.URL.revokeObjectURL(url);
}

function logout() {
  document.getElementById('admin-panel').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('admin-password').value = '';
  allPosts = [];
}

// Allow Enter key to submit password
document.getElementById('admin-password').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    checkPassword();
  }
});
</script>

<style>
#admin-panel {
  margin-top: 20px;
}

.table th {
  background-color: #f8f9fa;
}

.badge {
  font-size: 0.8em;
}
</style>
