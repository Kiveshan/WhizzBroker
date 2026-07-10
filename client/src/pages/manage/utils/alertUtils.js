import Swal from 'sweetalert2';

// Custom Confirm Dialog
export const showConfirmDialog = async (title, text, confirmButtonText = "Yes, delete it!", options = {}) => {
  const result = await Swal.fire({
    title,
    ...(options?.html ? { html: text } : { text }),
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText,
    cancelButtonText: 'Cancel',
    customClass: {
      popup: 'custom-swal-popup',
      title: 'custom-swal-title',
      content: 'custom-swal-content',
      confirmButton: 'custom-swal-confirm',
      cancelButton: 'custom-swal-cancel',
    },
  });
  return result.isConfirmed;
};

// Custom Alert
export const showAlert = (title, text, icon = 'success') => {
  return Swal.fire({
    title,
    text,
    icon,
    confirmButtonColor: '#3085d6',
    customClass: {
      popup: 'custom-swal-popup',
      title: 'custom-swal-title',
      content: 'custom-swal-content',
      confirmButton: 'custom-swal-confirm',
    },
  });
};