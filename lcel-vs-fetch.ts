// Comparison between Raw Fetch API and LCEL Approach

/**
 * 1. Raw Fetch Implementation with Error Handling
 */
async function rawFetch(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

/**
 * 2. Equivalent LCEL Implementation
 */
async function lcelFetch(url) {
    return lcel.fetch(url, {
        onError: (error) => console.error('LCEL fetch error:', error),
    });
}

/**
 * 3. Side-by-Side Comparison with Comments
 */
// Raw Fetch vs LCEL
// 1. Raw Fetch requires explicit error handling
// 2. LCEL handles errors using the onError option

/**
 * 4. Performance Considerations
 * Raw Fetch may block UI during data retrieval unlike LCEL, which manages async calls better.
 * LCEL's built-in caching mechanism can enhance performance.
 */

/**
 * 5. Error Handling Differences
 * Raw Fetch requires try-catch for errors.
 * LCEL allows centralized error handling via its configuration.
 */

/**
 * 6. Type Safety Advantages
 * Raw Fetch: No type safety, data shape must be managed manually.
 * LCEL provides typings that you can leverage for better type inference.
 */

/**
 * 7. Code Maintainability Comparison
 * Raw Fetch: More boilerplate for error handling and parsing.
 * LCEL: Less boilerplate, more concise API leads to cleaner code.
 */

/**
 * 8. Real-World Example Showing Why LCEL is Superior
 * In an application where multiple API calls are made,
 * LCEL can simplify data fetching, reduce redundancy, and improve the overall developer experience
 * especially with integrated error and response handling.
 */
