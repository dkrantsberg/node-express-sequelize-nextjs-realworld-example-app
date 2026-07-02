import React from 'react'
import useSWR from 'swr'

import fetcher from '@/api'
import { apiPath } from '@/config'
import ErrorMessage from '@/components/ErrorMessage'

const Tags = ({ setTab, setPage, setTag }) => {
  const { data, error } = useSWR(`${apiPath}/tags`, fetcher())
  if (error) return <ErrorMessage message="Cannot load popular tags..." />
  const tags = data ? data.tags : []
  return (
    <div className="tag-list">
      {tags?.map((tag) => (
        <a
          className="link tag-default tag-pill"
          key={tag}
          onClick={() => {
            setTab('tag')
            setTag(tag)
            setPage(0)
          }}
        >
          {tag}
        </a>
      ))}
    </div>
  )
}

export default Tags
