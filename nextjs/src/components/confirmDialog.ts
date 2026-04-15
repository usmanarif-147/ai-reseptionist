import Swal from 'sweetalert2'

interface ConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  isDanger?: boolean
}

export async function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
}: ConfirmDialogOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text: message,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    reverseButtons: true,
    customClass: {
      popup: 'swal-popup',
      title: 'swal-title',
      htmlContainer: 'swal-text',
      confirmButton: isDanger ? 'swal-confirm-danger' : 'swal-confirm',
      cancelButton: 'swal-cancel',
    },
    buttonsStyling: false,
  })

  return result.isConfirmed
}
