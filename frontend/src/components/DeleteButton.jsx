import axios from 'axios'
import { useParams } from 'react-router-dom'
import { trigger } from 'swr'

import { apiPath } from '@/config'
import useLoggedInUser from '@/useLoggedInUser'

const DeleteButton = ({ commentId }) => {
  const loggedInUser = useLoggedInUser()
  const { pid } = useParams()
  const handleDelete = async (commentId) => {
    await axios.delete(`${apiPath}/articles/${pid}/comments/${commentId}`, {
      headers: {
        Authorization: `Token ${loggedInUser?.token}`,
      },
    })
    trigger(`${apiPath}/articles/${pid}/comments`)
  }

  return (
    <span className="mod-options">
      <i className="ion-trash-a" onClick={() => handleDelete(commentId)} />
    </span>
  )
}

export default DeleteButton
