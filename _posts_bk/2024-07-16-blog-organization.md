---
layout: post
title: Blog Organization Features
date: 2024-07-16 12:00:00
description: >
  Introducing the new blog organization system with topic-based filtering and timeline views.
tags: blog features organization
categories: website
---

# Blog Organization Features

Welcome to the new blog organization system! This page demonstrates the various features available for organizing and browsing blog posts.

## Key Features

### 1. **Multiple View Modes**
- **All Posts**: View all posts in a card-based layout
- **By Topic**: Group posts by their tags/topics
- **Timeline**: Chronological view organized by year

### 2. **Advanced Filtering**
- Filter by specific topics/tags
- Filter by year
- Combine filters for precise results

### 3. **Responsive Design**
- Mobile-friendly layout
- Smooth transitions and hover effects
- Clean, modern interface

## How to Use

1. **Switch Views**: Use the buttons at the top to change between different viewing modes
2. **Apply Filters**: Use the dropdown menus to filter posts by topic or year
3. **Clear Filters**: Click "View All Posts" to reset all filters

## Adding New Posts

To add new blog posts:

1. Create a new markdown file in the `_posts/` directory
2. Use the filename format: `YYYY-MM-DD-title.md`
3. Add front matter with:
   - `title`: Post title
   - `date`: Publication date
   - `description`: Brief description
   - `tags`: Array of topic tags
   - `categories`: Post categories

Example:
```yaml
---
layout: post
title: My New Post
date: 2024-07-16 12:00:00
description: This is a description of my post
tags: [topic1, topic2]
categories: [category1]
---
```

The blog system will automatically organize your posts and make them available in all view modes! 