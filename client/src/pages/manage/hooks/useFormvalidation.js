"use client"

import { useCallback } from "react"

export function useFormValidation() {
  const validateEmail = useCallback((email, existingEmails = []) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!email) {
      return "Email is required"
    }

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address"
    }

    if (existingEmails.includes(email.toLowerCase())) {
      return "Email already exists"
    }

    return null
  }, [])

  const validateRequired = useCallback((value, fieldName) => {
    if (!value || value.toString().trim() === "") {
      return `${fieldName} is required`
    }
    return null
  }, [])

  const validateNumber = useCallback((value, fieldName, min = 0, max = null) => {
    if (value === "" || value === null || value === undefined) {
      return null // Allow empty values for optional fields
    }

    const numValue = Number(value)

    if (isNaN(numValue)) {
      return `${fieldName} must be a valid number`
    }

    if (numValue < min) {
      return `${fieldName} must be at least ${min}`
    }

    if (max !== null && numValue > max) {
      return `${fieldName} must not exceed ${max}`
    }

    return null
  }, [])

  const validateFileUpload = useCallback((files, maxFiles = 3, allowedTypes = ["application/pdf"]) => {
    if (!files || files.length === 0) {
      return null
    }

    if (files.length > maxFiles) {
      return `Maximum ${maxFiles} files allowed`
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return `Only ${allowedTypes.join(", ")} files are allowed`
      }
    }

    return null
  }, [])

  return {
    validateEmail,
    validateRequired,
    validateNumber,
    validateFileUpload,
  }
}
