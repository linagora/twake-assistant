import { useEffect } from 'react'

// The title the page opens with, "Twake Assistant": the name of the app,
// untranslated like in the tab before the app loads
let appTitle = null

/**
 * Titles the page after the view, followed by the name of the app: the tab,
 * the history and a screen reader tell the views apart. The name alone
 * without a title; the previous title back when the view goes.
 * @param {string} [title] - the title of the view
 */
export const useDocumentTitle = title => {
  useEffect(() => {
    appTitle ??= document.title
    const previous = document.title
    document.title = title ? `${title} – ${appTitle}` : appTitle
    return () => {
      document.title = previous
    }
  }, [title])
}
