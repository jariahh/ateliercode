// Review Comments API functions for code review
import { invoke } from '@tauri-apps/api/core';

/**
 * Review comment information
 */
export interface ReviewComment {
  id: string;
  file_change_id: string;
  line_number: number | null;
  author: string;
  comment: string;
  timestamp: number;
  resolved: boolean;
}

/**
 * Add a review comment to a file change
 * @param fileChangeId - The ID of the file change
 * @param author - The author of the comment (usually 'user')
 * @param comment - The comment text
 * @param lineNumber - Optional line number for inline comments
 * @returns Promise with the created review comment
 */
export async function addReviewComment(
  fileChangeId: string,
  author: string,
  comment: string,
  lineNumber?: number
): Promise<ReviewComment> {
  return await invoke<ReviewComment>('add_review_comment', {
    fileChangeId,
    author,
    comment,
    lineNumber: lineNumber ?? null,
  });
}

/**
 * Get all review comments for a file change
 * @param fileChangeId - The ID of the file change
 * @returns Promise with array of review comments
 */
export async function getReviewComments(fileChangeId: string): Promise<ReviewComment[]> {
  return await invoke<ReviewComment[]>('get_review_comments', {
    fileChangeId,
  });
}

/**
 * Mark a review comment as resolved
 * @param commentId - The ID of the comment
 * @returns Promise with the updated review comment
 */
export async function resolveReviewComment(commentId: string): Promise<ReviewComment> {
  return await invoke<ReviewComment>('resolve_review_comment', {
    commentId,
  });
}

/**
 * Mark a review comment as unresolved
 * @param commentId - The ID of the comment
 * @returns Promise with the updated review comment
 */
export async function unresolveReviewComment(commentId: string): Promise<ReviewComment> {
  return await invoke<ReviewComment>('unresolve_review_comment', {
    commentId,
  });
}

/**
 * Delete a review comment
 * @param commentId - The ID of the comment
 * @returns Promise that resolves when comment is deleted
 */
export async function deleteReviewComment(commentId: string): Promise<void> {
  return await invoke<void>('delete_review_comment', {
    commentId,
  });
}
