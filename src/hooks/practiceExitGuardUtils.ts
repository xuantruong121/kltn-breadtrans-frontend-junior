/**
 * Pure utility functions for Practice Exit Confirmation and Navigation Guard.
 * Extracted so they can be tested directly by Node's native test runner
 * without bundling or browser-specific Next.js navigation mocks.
 */

export interface LinkClickContext {
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  button?: number;
  target?: string | null;
  download?: boolean | string | null;
  href?: string | null;
  currentLocation: {
    origin: string;
    pathname: string;
    search: string;
    href: string;
  };
}

export interface LinkInterceptionResult {
  shouldIntercept: boolean;
  isExternal: boolean;
  destination: string | null;
}

/**
 * Pure link interception decision helper.
 * Evaluates modifier keys, mouse button, link attributes, schemes, and target URLs.
 */
export function shouldInterceptLinkClick(context: LinkClickContext): LinkInterceptionResult {
  const {
    metaKey,
    ctrlKey,
    shiftKey,
    altKey,
    button,
    target,
    download,
    href,
    currentLocation,
  } = context;

  // 1. Modifiers: Ctrl, Cmd, Shift, Alt (allow opening in new tabs/windows)
  if (metaKey || ctrlKey || shiftKey || altKey) {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  // 2. Non-primary button (middle click, right click)
  if (button !== undefined && button !== 0) {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  // 3. Target other than _self
  if (target && target !== "_self") {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  // 4. Download attribute
  if (download !== undefined && download !== null && download !== false) {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  if (!href) {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  // 5. Special schemes (hash, javascript, mailto, tel)
  if (
    href.startsWith("#") ||
    href.startsWith("javascript:") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  ) {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  let urlObj: URL;
  try {
    urlObj = new URL(href, currentLocation.href);
  } catch {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  // 6. Same page
  if (
    urlObj.pathname === currentLocation.pathname &&
    urlObj.search === currentLocation.search
  ) {
    return { shouldIntercept: false, isExternal: false, destination: null };
  }

  const isSameOrigin = urlObj.origin === currentLocation.origin;
  return {
    shouldIntercept: true,
    isExternal: !isSameOrigin,
    destination: isSameOrigin ? urlObj.pathname + urlObj.search : urlObj.href,
  };
}

/**
 * Evaluates whether an exit confirmation should be displayed based on
 * session completion status and active ownership flag.
 */
export function shouldShowPracticeExitConfirmation(options: {
  isSuccessfullySubmitted: boolean;
  enabled?: boolean;
}): boolean {
  if (options.enabled === false) return false;
  return !options.isSuccessfullySubmitted;
}
