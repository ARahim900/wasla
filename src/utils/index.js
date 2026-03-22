export function createPageUrl(pageName) {
    // Keep the original case to match the route paths defined in pages.config.js
    return '/' + pageName.replace(/ /g, '-');
}
