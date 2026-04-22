CREATE INDEX `posts_status_published_updated_created_idx`
ON `posts`(`status`, `publishedAt`, `updatedAt`, `createdAt`);

CREATE INDEX `posts_status_view_published_updated_created_idx`
ON `posts`(`status`, `viewCount`, `publishedAt`, `updatedAt`, `createdAt`);

CREATE INDEX `posts_status_series_order_published_updated_created_idx`
ON `posts`(`status`, `seriesId`, `seriesOrder`, `publishedAt`, `updatedAt`, `createdAt`);

CREATE INDEX `comments_post_status_created_idx`
ON `comments`(`postId`, `status`, `createdAt`);

CREATE INDEX `comments_status_created_idx`
ON `comments`(`status`, `createdAt`);

CREATE INDEX `gallery_items_published_sort_created_idx`
ON `gallery_items`(`isPublished`, `sortOrder`, `createdAt`);

CREATE INDEX `gallery_items_published_taken_created_idx`
ON `gallery_items`(`isPublished`, `takenAt`, `createdAt`);
