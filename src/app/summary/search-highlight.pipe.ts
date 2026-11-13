import { Pipe, PipeTransform } from '@angular/core';

/** Return escaped markup, still subject to Angular's normal HTML sanitization. */
@Pipe({ name: 'searchHighlight', standalone: true })
export class SearchHighlightPipe implements PipeTransform {
  transform(value: unknown, query: string): string {
    const text = String(value ?? '');
    const escape = (part: string) =>
      part.replace(
        /[&<>"']/g,
        (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
      );
    const needle = query.trim().toLowerCase();
    if (!needle) return escape(text);
    let result = '',
      start = 0,
      next: number;
    while ((next = text.toLowerCase().indexOf(needle, start)) !== -1) {
      result += escape(text.slice(start, next)) + '<mark>' + escape(text.slice(next, next + needle.length)) + '</mark>';
      start = next + needle.length;
    }
    return result + escape(text.slice(start));
  }
}
