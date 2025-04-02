# Next.js Hot Reloading Guide

This guide provides solutions to common hot reloading issues with Next.js development in the Command My Startup project.

## Quick Start

To get the best hot reloading experience, use one of these commands:

```bash
# Optimal for homepage development - includes auto-installing dependencies
npm run dev:homepage

# Optimal development setup with enhanced hot reloading
npm run dev:optimal

# Alternative with explicit Fast Refresh enabled
npm run dev:hot

# For environments where file system events don't work well (like some Docker containers)
npm run dev-polling
```

## Required Dependencies

For hot reloading to work properly, ensure these dependencies are installed:

```bash
# Install required dependencies for development
npm install @supabase/auth-helpers-nextjs @tailwindcss/typography
```

## Troubleshooting Hot Reloading Issues

### Common Problems and Solutions

1. **Changes not reflected immediately**
   - Clear the Next.js cache: `npm run dev:clear`
   - Ensure you're using the App Router correctly
   - Check that your component is correctly marked with `"use client"` if it uses client hooks

2. **Hot reloading stops working entirely**
   - Restart the development server
   - Check for syntax errors in your code
   - Make sure you haven't disabled Fast Refresh accidentally

3. **Slow refreshes**
   - Use native file system events instead of polling: `npm run dev:hot`
   - Reduce the size and complexity of your components
   - Ensure you're not revalidating data unnecessarily

## Best Practices for Fast Development

### Component Structure

1. **Client Components:**
   - Add `"use client"` at the top of your file if you use client hooks
   - Keep client components lean and focused on interactivity

```tsx
"use client";

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

2. **Server Components:**
   - Use Server Components (no `"use client"` directive) for data fetching and static content
   - Prefetch data where possible to avoid waterfall requests

```tsx
// This is a Server Component by default
import { getProducts } from '@/lib/data';

export default async function ProductList() {
  const products = await getProducts();
  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  );
}
```

### Data Fetching

1. **In Server Components:**
   - Use the built-in `fetch` with appropriate caching options
   - Use `revalidate` values that make sense for your data

```tsx
async function getData() {
  // This will be cached until manually invalidated
  const staticData = await fetch('https://api.example.com/static', { cache: 'force-cache' });
  
  // This will refresh every 60 seconds
  const revalidatedData = await fetch('https://api.example.com/products', { 
    next: { revalidate: 60 } 
  });
  
  // This will always fetch fresh data
  const dynamicData = await fetch('https://api.example.com/dynamic', { cache: 'no-store' });
  
  return {
    static: await staticData.json(),
    revalidated: await revalidatedData.json(),
    dynamic: await dynamicData.json()
  };
}
```

2. **In Client Components:**
   - Use SWR or React Query for client-side data fetching with built-in caching
   - Implement proper error handling to avoid breaking the UI

### Navigation and Routing

1. **Use the App Router Correctly:**
   - Organize your routes according to the App Router directory structure
   - Use route groups for better organization without affecting the URL structure

2. **Proper Next.js Hooks:**
   - Use `usePathname()` instead of router.pathname
   - Use `useSearchParams()` instead of router.query
   - Use `useParams()` for dynamic route segments

```tsx
"use client";

import { usePathname, useSearchParams, useParams } from 'next/navigation';

export function NavigationComponent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  
  // Now you can use these values
  return (
    <div>
      <p>Current path: {pathname}</p>
      <p>Search query: {searchParams.get('query')}</p>
      <p>Dynamic param: {params.id}</p>
    </div>
  );
}
```

## Technical Configuration

The project includes these optimizations for hot reloading:

1. **Webpack Configuration:**
   - Uses native file system events by default
   - Falls back to polling only when explicitly requested
   - Ignores node_modules for faster processing

2. **Fast Refresh:**
   - Explicitly enabled in development scripts
   - Optimized buffer settings for better performance

3. **Clean Cache:**
   - Scripts to clear the .next directory for a fresh start
   - Helps resolve persistent caching issues

## Environment-Specific Recommendations

### macOS/Linux
- Use `npm run dev:optimal` for the best experience
- Native file system events work well

### Windows
- If you experience slow refreshes, try `npm run dev:hot`
- For WSL environments, consider `npm run dev-polling`

### Docker/Containerized Development
- Use `npm run dev-polling` inside containers
- Mount your source code as a volume for better performance