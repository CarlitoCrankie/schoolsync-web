// pages/api/upload.js
import { getPool, sql } from '../../lib/database'
import formidable from 'formidable'
import csv from 'csv-parser'
import fs from 'fs'
import crypto from 'crypto'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

import { getPool, sql } from '../../lib/database'
import formidable from 'formidable'
import csv from 'csv-parser'
import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import os from 'os'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Use system temp directory instead of hardcoded path
    const uploadDir = os.tmpdir()
    
    // Ensure temp directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    })

    const [fields, files] = await form.parse(req)
    
    const file = files.file?.[0]
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const school_id = fields.school_id?.[0]
    if (!school_id) {
      return res.status(400).json({ error: 'School ID is required' })
    }

    const results = await processStudentCSV(file.filepath, parseInt(school_id))
    
    // Clean up uploaded file
    fs.unlinkSync(file.filepath)
    
    res.json(results)
    
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({
      success: false,
      error: 'Upload failed',
      details: error.message
    })
  }
}


async function processStudentCSV(filePath, schoolId) {
  console.log('Starting CSV processing for school:', schoolId)
  
  const pool = await getPool()
  const results = []
  const errors = []
  const warnings = []
  
  let studentsAdded = 0
  let studentsUpdated = 0
  let parentsCreated = 0
  let parentsUpdated = 0
  let defaultPasswordsSet = 0

  return new Promise((resolve, reject) => {
    const students = []
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Clean up the row data and skip empty rows
        const cleanRow = {}
        for (const [key, value] of Object.entries(row)) {
          cleanRow[key.trim().toLowerCase()] = value?.toString().trim() || ''
        }
        
        if (cleanRow.name && cleanRow.name !== '' && !cleanRow.name.includes('INSTRUCTIONS')) {
          students.push(cleanRow)
        }
      })
      .on('end', async () => {
        console.log(`Found ${students.length} students to process`)
        
        try {
          // Process each student
          for (let i = 0; i < students.length; i++) {
            const student = students[i]
            
            try {
              const result = await processStudentRow(pool, student, schoolId, i + 1)
              
              if (result.studentAdded) studentsAdded++
              if (result.studentUpdated) studentsUpdated++
              if (result.parentCreated) parentsCreated++
              if (result.parentUpdated) parentsUpdated++
              if (result.defaultPasswordSet) defaultPasswordsSet++
              
              if (result.warnings.length > 0) {
                warnings.push(...result.warnings)
              }
              
              results.push({
                row: i + 1,
                student_name: student.name,
                status: result.status,
                details: result.details
              })
              
            } catch (error) {
              console.error(`Error processing row ${i + 1}:`, error)
              errors.push({
                row: i + 1,
                student_name: student.name || 'Unknown',
                error: error.message
              })
            }
          }

          resolve({
            success: errors.length === 0,
            summary: {
              total_rows: students.length,
              students_added: studentsAdded,
              students_updated: studentsUpdated,
              parents_created: parentsCreated,
              parents_updated: parentsUpdated,
              default_passwords_set: defaultPasswordsSet,
              errors: errors.length
            },
            results,
            errors,
            warnings,
            timestamp: new Date().toISOString()
          })
          
        } catch (error) {
          console.error('CSV processing error:', error)
          reject(error)
        }
      })
      .on('error', (error) => {
        console.error('CSV reading error:', error)
        reject(error)
      })
  })
}

async function processStudentRow(pool, studentData, schoolId, rowNumber) {
  const {
    name,
    grade,
    student_code,
    parent_name,
    parent_email,
    parent_phone,
    parent_password
  } = studentData

  const warnings = []
  let studentAdded = false
  let studentUpdated = false
  let parentCreated = false
  let parentUpdated = false
  let defaultPasswordSet = false

  // Validate required fields
  if (!name || name.trim() === '') {
    throw new Error('Student name is required')
  }

  // Use default password if not provided
  const finalParentPassword = parent_password && parent_password.trim() !== '' ? parent_password.trim() : '12345'
  const hashedPassword = hashPassword(finalParentPassword)

  // Start transaction
  const transaction = new sql.Transaction(pool)
  await transaction.begin()

  try {
    // Check if student already exists
    const existingStudent = await transaction.request()
      .input('name', sql.NVarChar, name.trim())
      .input('schoolId', sql.Int, schoolId)
      .query(`
        SELECT StudentID, ParentPasswordSet
        FROM Students 
        WHERE Name = @name AND SchoolID = @schoolId
      `)

    let studentId

    if (existingStudent.recordset.length > 0) {
      // Update existing student
      studentId = existingStudent.recordset[0].StudentID
      const hasExistingPassword = existingStudent.recordset[0].ParentPasswordSet

      const updateFields = []
      const request = transaction.request()
      request.input('studentId', sql.Int, studentId)

      if (grade && grade.trim() !== '') {
        updateFields.push('Grade = @grade')
        request.input('grade', sql.NVarChar, grade.trim())
      }

      if (student_code && student_code.trim() !== '') {
        updateFields.push('StudentCode = @studentCode')
        request.input('studentCode', sql.NVarChar, student_code.trim())
      }

      // Only set password if not already set
      if (!hasExistingPassword) {
        updateFields.push('ParentPasswordHash = @passwordHash')
        updateFields.push('ParentPasswordSet = 1')
        request.input('passwordHash', sql.NVarChar, hashedPassword)
        defaultPasswordSet = true
      }

      if (updateFields.length > 0) {
        await request.query(`
          UPDATE Students 
          SET ${updateFields.join(', ')}
          WHERE StudentID = @studentId
        `)
        studentUpdated = true
      }

      if (hasExistingPassword && finalParentPassword === '12345') {
        warnings.push(`Row ${rowNumber}: Student "${name}" already has a password set, skipping password update`)
      }

    } else {
      // Create new student
      const insertResult = await transaction.request()
        .input('name', sql.NVarChar, name.trim())
        .input('schoolId', sql.Int, schoolId)
        .input('grade', sql.NVarChar, grade ? grade.trim() : null)
        .input('studentCode', sql.NVarChar, student_code ? student_code.trim() : null)
        .input('passwordHash', sql.NVarChar, hashedPassword)
        .query(`
          INSERT INTO Students (Name, SchoolID, Grade, StudentCode, ParentPasswordHash, ParentPasswordSet, IsActive, CreatedAt)
          OUTPUT INSERTED.StudentID
          VALUES (@name, @schoolId, @grade, @studentCode, @passwordHash, 1, 1, GETDATE())
        `)

      studentId = insertResult.recordset[0].StudentID
      studentAdded = true
      defaultPasswordSet = true
    }

    // Handle parent information (same as before)
    if (parent_name || parent_email || parent_phone) {
      const existingParent = await transaction.request()
        .input('studentId', sql.Int, studentId)
        .query('SELECT ParentID FROM Parents WHERE StudentID = @studentId')

      if (existingParent.recordset.length > 0) {
        // Update existing parent
        const parentUpdateFields = []
        const parentRequest = transaction.request()
        parentRequest.input('studentId', sql.Int, studentId)

        if (parent_name && parent_name.trim() !== '') {
          parentUpdateFields.push('Name = @parentName')
          parentRequest.input('parentName', sql.NVarChar, parent_name.trim())
        }

        if (parent_email && parent_email.trim() !== '') {
          parentUpdateFields.push('Email = @parentEmail')
          parentRequest.input('parentEmail', sql.NVarChar, parent_email.trim())
        }

        if (parent_phone && parent_phone.trim() !== '') {
          parentUpdateFields.push('PhoneNumber = @parentPhone')
          parentRequest.input('parentPhone', sql.NVarChar, parent_phone.trim())
        }

        if (parentUpdateFields.length > 0) {
          await parentRequest.query(`
            UPDATE Parents 
            SET ${parentUpdateFields.join(', ')}
            WHERE StudentID = @studentId
          `)
          parentUpdated = true
        }

      } else {
        // Create new parent record
        await transaction.request()
          .input('studentId', sql.Int, studentId)
          .input('parentName', sql.NVarChar, parent_name ? parent_name.trim() : 'Parent/Guardian')
          .input('parentEmail', sql.NVarChar, parent_email ? parent_email.trim() : null)
          .input('parentPhone', sql.NVarChar, parent_phone ? parent_phone.trim() : null)
          .query(`
            INSERT INTO Parents (StudentID, Name, Email, PhoneNumber, IsPrimary, CreatedAt)
            VALUES (@studentId, @parentName, @parentEmail, @parentPhone, 1, GETDATE())
          `)
        parentCreated = true
      }
    }

    // Commit transaction
    await transaction.commit()

    // Generate status message
    let status = []
    if (studentAdded) status.push('Student created')
    if (studentUpdated) status.push('Student updated')
    if (parentCreated) status.push('Parent created')
    if (parentUpdated) status.push('Parent updated')
    if (defaultPasswordSet) status.push('Default password set')

    return {
      status: status.join(', ') || 'No changes',
      details: `Processed successfully${defaultPasswordSet ? ' with default password "12345"' : ''}`,
      studentAdded,
      studentUpdated,
      parentCreated,
      parentUpdated,
      defaultPasswordSet,
      warnings
    }

  } catch (error) {
    await transaction.rollback()
    throw error
  }
}