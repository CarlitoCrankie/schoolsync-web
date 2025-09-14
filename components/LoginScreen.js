// import { useState, useEffect } from 'react'

// export default function LoginScreen({ onLogin }) {
//   const [currentView, setCurrentView] = useState('login') // 'login', 'set-password'
//   const [formData, setFormData] = useState({
//     username: '',
//     password: ''
//   })
//   const [passwordSetup, setPasswordSetup] = useState({
//     student_name: '',
//     school_name: '', // Changed to school_name instead of school_id
//     new_password: '',
//     confirm_password: ''
//   })
//   const [schools, setSchools] = useState([])
//   const [loadingSchools, setLoadingSchools] = useState(false)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')
//   const [message, setMessage] = useState('')
  
//   // Password visibility states
//   const [showPasswords, setShowPasswords] = useState({
//     loginPassword: false,
//     newPassword: false,
//     confirmPassword: false
//   })

//   // Load schools when switching to set-password view
//   useEffect(() => {
//     if (currentView === 'set-password' && schools.length === 0) {
//       loadSchools()
//     }
//   }, [currentView])

//   const loadSchools = async () => {
//     setLoadingSchools(true)
//     setError('')
    
//     try {
//       const response = await fetch('/api/schools')
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`)
//       }

//       const result = await response.json()
      
//       if (result.success && result.data) {
//         // Filter active schools and map to simpler format
//         const activeSchools = result.data
//           .filter(school => school.status === 'active')
//           .map(school => ({
//             id: school.school_id,
//             name: school.name,
//             location: school.location
//           }))
        
//         setSchools(activeSchools)
        
//         // Set first school as default
//         if (activeSchools.length > 0) {
//           setPasswordSetup(prev => ({
//             ...prev,
//             school_name: activeSchools[0].name
//           }))
//         }
//       } else {
//         throw new Error('Invalid response format')
//       }
//     } catch (error) {
//       console.error('Failed to load schools:', error)
//       setError('Failed to load schools. Please try again.')
//     } finally {
//       setLoadingSchools(false)
//     }
//   }

//   const handleInputChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value
//     })
//     setError('')
//   }

//   const handlePasswordSetupChange = (e) => {
//     setPasswordSetup({
//       ...passwordSetup,
//       [e.target.name]: e.target.value
//     })
//     setError('')
//   }

//   // Toggle password visibility
//   const togglePasswordVisibility = (field) => {
//     setShowPasswords(prev => ({
//       ...prev,
//       [field]: !prev[field]
//     }))
//   }

//   const handleLogin = async (e) => {
//     e.preventDefault()
    
//     if (!formData.username || !formData.password) {
//       setError('Please fill in all required fields')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'login',
//           username: formData.username,
//           password: formData.password
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || 'Login failed')
//       }

//       onLogin(data.user, data.token)
//     } catch (error) {
//       if (error.message.includes('Invalid credentials')) {
//         setError('Invalid username or password. If you\'re a parent, make sure you\'ve set up your password first.')
//       } else {
//         setError(error.message || 'Login failed')
//       }
//     } finally {
//       setLoading(false)
//     }
//   }

//   const checkPasswordStatus = async () => {
//     if (!passwordSetup.student_name || !passwordSetup.school_name) {
//       setError('Please enter student name and select school')
//       return
//     }

//     // Find the selected school to get its ID
//     const selectedSchool = schools.find(school => school.name === passwordSetup.school_name)
//     if (!selectedSchool) {
//       setError('Please select a valid school')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'check_password_status',
//           student_name: passwordSetup.student_name,
//           school_id: selectedSchool.id
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || 'Student not found')
//       }
      
//       if (data.password_set) {
//         setError('Password already set for this student. Please use the login form.')
//       } else {
//         setMessage(`Student found: ${data.student_name} (${data.grade}) at ${data.school_name}. You can now set a password.`)
//       }
//     } catch (error) {
//       setError(error.message || 'Student not found')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleSetPassword = async (e) => {
//     e.preventDefault()

//     if (!passwordSetup.student_name || !passwordSetup.school_name || 
//         !passwordSetup.new_password || !passwordSetup.confirm_password) {
//       setError('Please fill in all fields')
//       return
//     }

//     if (passwordSetup.new_password !== passwordSetup.confirm_password) {
//       setError('Passwords do not match')
//       return
//     }

//     if (passwordSetup.new_password.length < 6) {
//       setError('Password must be at least 6 characters long')
//       return
//     }

//     // Find the selected school to get its ID
//     const selectedSchool = schools.find(school => school.name === passwordSetup.school_name)
//     if (!selectedSchool) {
//       setError('Please select a valid school')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'set_password',
//           student_name: passwordSetup.student_name,
//           school_id: selectedSchool.id,
//           new_password: passwordSetup.new_password
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || 'Failed to set password')
//       }
      
//       setMessage('Password set successfully! You can now login with your child\'s name and the password you just created.')
//       setCurrentView('login')
//       setFormData({ ...formData, username: passwordSetup.student_name })
//       setPasswordSetup({
//         student_name: '',
//         school_name: schools.length > 0 ? schools[0].name : '',
//         new_password: '',
//         confirm_password: ''
//       })
//       // Reset password visibility
//       setShowPasswords({
//         loginPassword: false,
//         newPassword: false,
//         confirmPassword: false
//       })
//     } catch (error) {
//       setError(error.message || 'Failed to set password')
//     } finally {
//       setLoading(false)
//     }
//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
//       <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
//         <div className="text-center mb-8">
//           <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
//             <span className="text-white text-2xl">🏫</span>
//           </div>
//           <h1 className="text-2xl font-bold text-gray-900">SchoolSync</h1>
//           <p className="text-gray-600">Multi-School Attendance System</p>
//         </div>

//         {error && (
//           <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//             {error}
//           </div>
//         )}

//         {message && (
//           <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//             {message}
//           </div>
//         )}

//         <div className="mb-4">
//           <div className="flex border-b border-gray-200">
//             <button
//               onClick={() => setCurrentView('login')}
//               className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
//                 currentView === 'login'
//                   ? 'border-indigo-500 text-indigo-600'
//                   : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               Login
//             </button>
//             <button
//               onClick={() => setCurrentView('set-password')}
//               className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
//                 currentView === 'set-password'
//                   ? 'border-indigo-500 text-indigo-600'
//                   : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               First Time? Set Password
//             </button>
//           </div>
//         </div>

//         {currentView === 'login' ? (
//           <form onSubmit={handleLogin} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Username
//                 <span className="text-gray-400 text-xs ml-1">(Admin username or Child's full name for parents)</span>
//               </label>
//               <input 
//                 type="text" 
//                 name="username"
//                 value={formData.username}
//                 onChange={handleInputChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                 placeholder="Enter username or child's name"
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
//               <div className="relative">
//                 <input 
//                   type={showPasswords.loginPassword ? "text" : "password"}
//                   name="password"
//                   value={formData.password}
//                   onChange={handleInputChange}
//                   className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                   placeholder="Enter password"
//                   disabled={loading}
//                 />
//                 <button
//                   type="button"
//                   onClick={() => togglePasswordVisibility('loginPassword')}
//                   className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
//                   disabled={loading}
//                 >
//                   {showPasswords.loginPassword ? (
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a10.007 10.007 0 00-5.411 8.536M9.878 9.878L12 12m6.121-6.121A10.007 10.007 0 0112 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 011.563 3.029m5.858.908l4.242 4.242m0 0a3 3 0 01-4.243-4.243m4.243 4.243L21.536 21.536" />
//                     </svg>
//                   ) : (
//                     <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                     </svg>
//                   )}
//                 </button>
//               </div>
//             </div>

//             <button 
//               type="submit"
//               disabled={loading}
//               className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//             >
//               {loading ? 'Logging in...' : 'Login'}
//             </button>
//           </form>
//         ) : (
//           <form onSubmit={handleSetPassword} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Child's Full Name
//               </label>
//               <input 
//                 type="text" 
//                 name="student_name"
//                 value={passwordSetup.student_name}
//                 onChange={handlePasswordSetupChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                 placeholder="Enter your child's full name exactly as registered"
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
//               {loadingSchools ? (
//                 <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 flex items-center">
//                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
//                   Loading schools...
//                 </div>
//               ) : schools.length > 0 ? (
//                 <select 
//                   name="school_name"
//                   value={passwordSetup.school_name}
//                   onChange={handlePasswordSetupChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                   disabled={loading}
//                 >
//                   <option value="">Select your child's school</option>
//                   {schools.map((school) => (
//                     <option key={school.id} value={school.name}>
//                       {school.name}{school.location ? ` - ${school.location}` : ''}
//                     </option>
//                   ))}
//                 </select>
//               ) : (
//                 <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
//                   No active schools found. 
//                   <button 
//                     type="button" 
//                     onClick={loadSchools}
//                     className="ml-2 text-blue-600 underline hover:text-blue-800"
//                   >
//                     Try again
//                   </button>
//                 </div>
//               )}
//             </div>

//             <div>
//               <button 
//                 type="button"
//                 onClick={checkPasswordStatus}
//                 disabled={loading || !passwordSetup.student_name || !passwordSetup.school_name || schools.length === 0}
//                 className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//               >
//                 {loading ? 'Checking...' : 'Check Student'}
//               </button>
//             </div>

//             {message && (
//               <>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     New Password
//                   </label>
//                   <div className="relative">
//                     <input 
//                       type={showPasswords.newPassword ? "text" : "password"}
//                       name="new_password"
//                       value={passwordSetup.new_password}
//                       onChange={handlePasswordSetupChange}
//                       className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                       placeholder="Enter new password (6+ characters)"
//                       disabled={loading}
//                       minLength="6"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => togglePasswordVisibility('newPassword')}
//                       className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
//                       disabled={loading}
//                     >
//                       {showPasswords.newPassword ? (
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a10.007 10.007 0 00-5.411 8.536M9.878 9.878L12 12m6.121-6.121A10.007 10.007 0 0112 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 011.563 3.029m5.858.908l4.242 4.242m0 0a3 3 0 01-4.243-4.243m4.243 4.243L21.536 21.536" />
//                         </svg>
//                       ) : (
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                         </svg>
//                       )}
//                     </button>
//                   </div>
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Confirm Password
//                   </label>
//                   <div className="relative">
//                     <input 
//                       type={showPasswords.confirmPassword ? "text" : "password"}
//                       name="confirm_password"
//                       value={passwordSetup.confirm_password}
//                       onChange={handlePasswordSetupChange}
//                       className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                       placeholder="Confirm your password"
//                       disabled={loading}
//                       minLength="6"
//                     />
//                     <button
//                       type="button"
//                       onClick={() => togglePasswordVisibility('confirmPassword')}
//                       className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
//                       disabled={loading}
//                     >
//                       {showPasswords.confirmPassword ? (
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a10.007 10.007 0 00-5.411 8.536M9.878 9.878L12 12m6.121-6.121A10.007 10.007 0 0112 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 011.563 3.029m5.858.908l4.242 4.242m0 0a3 3 0 01-4.243-4.243m4.243 4.243L21.536 21.536" />
//                         </svg>
//                       ) : (
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//                         </svg>
//                       )}
//                     </button>
//                   </div>
//                 </div>

//                 <button 
//                   type="submit"
//                   disabled={loading}
//                   className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//                 >
//                   {loading ? 'Setting Password...' : 'Set Password'}
//                 </button>
//               </>
//             )}
//           </form>
//         )}

//         <div className="mt-6 text-xs text-gray-500 space-y-1">
//           <p><strong>Instructions:</strong></p>
//           <p><strong>Parents:</strong> First time? Use "Set Password" tab with your child's exact name.</p>
//           <p><strong>Staff:</strong> Use your admin username and password.</p>
//           <p><strong>Demo Admin:</strong> mainadmin / admin123</p>
//         </div>
//       </div>
//     </div>
//   )
// }

// import { useState, useEffect } from 'react'

// export default function LoginScreen({ onLogin }) {
//   const [currentView, setCurrentView] = useState('login') // 'login', 'set-password', 'reset-password'
//   const [formData, setFormData] = useState({
//     username: '',
//     password: ''
//   })
//   const [passwordSetup, setPasswordSetup] = useState({
//     student_name: '',
//     school_name: '',
//     new_password: '',
//     confirm_password: ''
//   })
//   const [passwordReset, setPasswordReset] = useState({
//     student_name: '',
//     school_name: '',
//     new_password: '',
//     confirm_password: ''
//   })
//   const [schools, setSchools] = useState([])
//   const [loadingSchools, setLoadingSchools] = useState(false)
//   const [loading, setLoading] = useState(false)
//   const [error, setError] = useState('')
//   const [message, setMessage] = useState('')
  
//   // Password visibility states
//   const [showPasswords, setShowPasswords] = useState({
//     loginPassword: false,
//     newPassword: false,
//     confirmPassword: false,
//     resetNewPassword: false,
//     resetConfirmPassword: false
//   })

//   // Load schools when switching to set-password or reset-password view
//   useEffect(() => {
//     if ((currentView === 'set-password' || currentView === 'reset-password') && schools.length === 0) {
//       loadSchools()
//     }
//   }, [currentView])

//   const loadSchools = async () => {
//     setLoadingSchools(true)
//     setError('')
    
//     try {
//       const response = await fetch('/api/schools')
      
//       if (!response.ok) {
//         throw new Error(`HTTP error! status: ${response.status}`)
//       }

//       const result = await response.json()
      
//       if (result.success && result.data) {
//         const activeSchools = result.data
//           .filter(school => school.status === 'active')
//           .map(school => ({
//             id: school.school_id,
//             name: school.name,
//             location: school.location
//           }))
        
//         setSchools(activeSchools)
        
//         if (activeSchools.length > 0) {
//           setPasswordSetup(prev => ({ ...prev, school_name: activeSchools[0].name }))
//           setPasswordReset(prev => ({ ...prev, school_name: activeSchools[0].name }))
//         }
//       } else {
//         throw new Error('Invalid response format')
//       }
//     } catch (error) {
//       console.error('Failed to load schools:', error)
//       setError('Failed to load schools. Please try again.')
//     } finally {
//       setLoadingSchools(false)
//     }
//   }

//   const handleInputChange = (e) => {
//     setFormData({
//       ...formData,
//       [e.target.name]: e.target.value
//     })
//     setError('')
//   }

//   const handlePasswordSetupChange = (e) => {
//     setPasswordSetup({
//       ...passwordSetup,
//       [e.target.name]: e.target.value
//     })
//     setError('')
//   }

//   const handlePasswordResetChange = (e) => {
//     setPasswordReset({
//       ...passwordReset,
//       [e.target.name]: e.target.value
//     })
//     setError('')
//   }

//   const togglePasswordVisibility = (field) => {
//     setShowPasswords(prev => ({
//       ...prev,
//       [field]: !prev[field]
//     }))
//   }

//   const clearMessages = () => {
//     setError('')
//     setMessage('')
//   }

//   const switchView = (view) => {
//     setCurrentView(view)
//     clearMessages()
//   }

//   const handleLogin = async (e) => {
//     e.preventDefault()
    
//     if (!formData.username || !formData.password) {
//       setError('Please fill in all required fields')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'login',
//           username: formData.username,
//           password: formData.password
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || 'Login failed')
//       }

//       onLogin(data.user, data.token)
//     } catch (error) {
//       if (error.message.includes('Invalid credentials')) {
//         setError('Invalid username or password. If you\'re a parent, make sure you\'ve set up your password first.')
//       } else {
//         setError(error.message || 'Login failed')
//       }
//     } finally {
//       setLoading(false)
//     }
//   }

//   const checkPasswordStatus = async (isReset = false) => {
//     const data = isReset ? passwordReset : passwordSetup
    
//     if (!data.student_name || !data.school_name) {
//       setError('Please enter student name and select school')
//       return
//     }

//     const selectedSchool = schools.find(school => school.name === data.school_name)
//     if (!selectedSchool) {
//       setError('Please select a valid school')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'check_password_status',
//           student_name: data.student_name,
//           school_id: selectedSchool.id
//         }),
//       })

//       const result = await response.json()

//       if (!response.ok) {
//         throw new Error(result.error || 'Student not found')
//       }
      
//       if (isReset) {
//         if (!result.password_set) {
//           setError('No password is set for this student. Please use "First Time? Set Password" instead.')
//         } else {
//           setMessage(`Student found: ${result.student_name} (${result.grade}) at ${result.school_name}. You can now reset the password.`)
//         }
//       } else {
//         if (result.password_set) {
//           setError('Password already set for this student. Please use the login form or reset password if forgotten.')
//         } else {
//           setMessage(`Student found: ${result.student_name} (${result.grade}) at ${result.school_name}. You can now set a password.`)
//         }
//       }
//     } catch (error) {
//       setError(error.message || 'Student not found')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleSetPassword = async (e) => {
//     e.preventDefault()

//     if (!passwordSetup.student_name || !passwordSetup.school_name || 
//         !passwordSetup.new_password || !passwordSetup.confirm_password) {
//       setError('Please fill in all fields')
//       return
//     }

//     if (passwordSetup.new_password !== passwordSetup.confirm_password) {
//       setError('Passwords do not match')
//       return
//     }

//     if (passwordSetup.new_password.length < 6) {
//       setError('Password must be at least 6 characters long')
//       return
//     }

//     const selectedSchool = schools.find(school => school.name === passwordSetup.school_name)
//     if (!selectedSchool) {
//       setError('Please select a valid school')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'set_password',
//           student_name: passwordSetup.student_name,
//           school_id: selectedSchool.id,
//           new_password: passwordSetup.new_password
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || 'Failed to set password')
//       }
      
//       setMessage('Password set successfully! You can now login with your child\'s name and the password you just created.')
//       setCurrentView('login')
//       setFormData({ ...formData, username: passwordSetup.student_name })
//       setPasswordSetup({
//         student_name: '',
//         school_name: schools.length > 0 ? schools[0].name : '',
//         new_password: '',
//         confirm_password: ''
//       })
//       setShowPasswords({
//         loginPassword: false,
//         newPassword: false,
//         confirmPassword: false,
//         resetNewPassword: false,
//         resetConfirmPassword: false
//       })
//     } catch (error) {
//       setError(error.message || 'Failed to set password')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const handleResetPassword = async (e) => {
//     e.preventDefault()

//     if (!passwordReset.student_name || !passwordReset.school_name || 
//         !passwordReset.new_password || !passwordReset.confirm_password) {
//       setError('Please fill in all fields')
//       return
//     }

//     if (passwordReset.new_password !== passwordReset.confirm_password) {
//       setError('Passwords do not match')
//       return
//     }

//     if (passwordReset.new_password.length < 6) {
//       setError('Password must be at least 6 characters long')
//       return
//     }

//     const selectedSchool = schools.find(school => school.name === passwordReset.school_name)
//     if (!selectedSchool) {
//       setError('Please select a valid school')
//       return
//     }

//     setLoading(true)
//     setError('')

//     try {
//       const response = await fetch('/api/auth', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           action: 'reset_password',
//           student_name: passwordReset.student_name,
//           school_id: selectedSchool.id,
//           new_password: passwordReset.new_password
//         }),
//       })

//       const data = await response.json()

//       if (!response.ok) {
//         throw new Error(data.error || 'Failed to reset password')
//       }
      
//       setMessage('Password reset successfully! You can now login with your child\'s name and the new password.')
//       setCurrentView('login')
//       setFormData({ ...formData, username: passwordReset.student_name })
//       setPasswordReset({
//         student_name: '',
//         school_name: schools.length > 0 ? schools[0].name : '',
//         new_password: '',
//         confirm_password: ''
//       })
//       setShowPasswords({
//         loginPassword: false,
//         newPassword: false,
//         confirmPassword: false,
//         resetNewPassword: false,
//         resetConfirmPassword: false
//       })
//     } catch (error) {
//       setError(error.message || 'Failed to reset password')
//     } finally {
//       setLoading(false)
//     }
//   }

//   const renderPasswordInput = (type, value, onChange, placeholder, showPasswordKey, minLength = 6) => (
//     <div className="relative">
//       <input 
//         type={showPasswords[showPasswordKey] ? "text" : "password"}
//         name={type}
//         value={value}
//         onChange={onChange}
//         className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//         placeholder={placeholder}
//         disabled={loading}
//         minLength={minLength}
//       />
//       <button
//         type="button"
//         onClick={() => togglePasswordVisibility(showPasswordKey)}
//         className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
//         disabled={loading}
//       >
//         {showPasswords[showPasswordKey] ? (
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a10.007 10.007 0 00-5.411 8.536M9.878 9.878L12 12m6.121-6.121A10.007 10.007 0 0112 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 011.563 3.029m5.858.908l4.242 4.242m0 0a3 3 0 01-4.243-4.243m4.243 4.243L21.536 21.536" />
//           </svg>
//         ) : (
//           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
//             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
//           </svg>
//         )}
//       </button>
//     </div>
//   )

//   return (
//     <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
//       <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
//         <div className="text-center mb-8">
//           <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
//             <span className="text-white text-2xl">🏫</span>
//           </div>
//           <h1 className="text-2xl font-bold text-gray-900">SchoolSync</h1>
//           <p className="text-gray-600">Multi-School Attendance System</p>
//         </div>

//         {error && (
//           <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
//             {error}
//           </div>
//         )}

//         {message && (
//           <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
//             {message}
//           </div>
//         )}

//         <div className="mb-4">
//           <div className="flex border-b border-gray-200">
//             <button
//               onClick={() => switchView('login')}
//               className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
//                 currentView === 'login'
//                   ? 'border-indigo-500 text-indigo-600'
//                   : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               Login
//             </button>
//             <button
//               onClick={() => switchView('set-password')}
//               className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
//                 currentView === 'set-password'
//                   ? 'border-indigo-500 text-indigo-600'
//                   : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               First Time?
//             </button>
//             <button
//               onClick={() => switchView('reset-password')}
//               className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
//                 currentView === 'reset-password'
//                   ? 'border-indigo-500 text-indigo-600'
//                   : 'border-transparent text-gray-500 hover:text-gray-700'
//               }`}
//             >
//               Reset Password
//             </button>
//           </div>
//         </div>

//         {currentView === 'login' ? (
//           <form onSubmit={handleLogin} className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Username
//                 <span className="text-gray-400 text-xs ml-1">(Admin username or Child's full name for parents)</span>
//               </label>
//               <input 
//                 type="text" 
//                 name="username"
//                 value={formData.username}
//                 onChange={handleInputChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                 placeholder="Enter username or child's name"
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Password
//                 <button
//                   type="button"
//                   onClick={() => switchView('reset-password')}
//                   className="text-indigo-600 hover:text-indigo-800 text-xs ml-2 underline"
//                 >
//                   Forgot password?
//                 </button>
//               </label>
//               {renderPasswordInput('password', formData.password, handleInputChange, 'Enter password', 'loginPassword', 1)}
//             </div>

//             <button 
//               type="submit"
//               disabled={loading}
//               className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//             >
//               {loading ? 'Logging in...' : 'Login'}
//             </button>
//           </form>
//         ) : currentView === 'set-password' ? (
//           <form onSubmit={handleSetPassword} className="space-y-4">
//             <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
//               <p className="text-sm text-blue-800">
//                 <strong>First time parent?</strong> Set up your password to access your child's attendance records.
//               </p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Child's Full Name
//               </label>
//               <input 
//                 type="text" 
//                 name="student_name"
//                 value={passwordSetup.student_name}
//                 onChange={handlePasswordSetupChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                 placeholder="Enter your child's full name exactly as registered"
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
//               {loadingSchools ? (
//                 <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 flex items-center">
//                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
//                   Loading schools...
//                 </div>
//               ) : schools.length > 0 ? (
//                 <select 
//                   name="school_name"
//                   value={passwordSetup.school_name}
//                   onChange={handlePasswordSetupChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                   disabled={loading}
//                 >
//                   <option value="">Select your child's school</option>
//                   {schools.map((school) => (
//                     <option key={school.id} value={school.name}>
//                       {school.name}{school.location ? ` - ${school.location}` : ''}
//                     </option>
//                   ))}
//                 </select>
//               ) : (
//                 <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
//                   No active schools found. 
//                   <button 
//                     type="button" 
//                     onClick={loadSchools}
//                     className="ml-2 text-blue-600 underline hover:text-blue-800"
//                   >
//                     Try again
//                   </button>
//                 </div>
//               )}
//             </div>

//             <div>
//               <button 
//                 type="button"
//                 onClick={() => checkPasswordStatus(false)}
//                 disabled={loading || !passwordSetup.student_name || !passwordSetup.school_name || schools.length === 0}
//                 className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//               >
//                 {loading ? 'Checking...' : 'Check Student'}
//               </button>
//             </div>

//             {message && (
//               <>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     New Password
//                   </label>
//                   {renderPasswordInput('new_password', passwordSetup.new_password, handlePasswordSetupChange, 'Enter new password (6+ characters)', 'newPassword')}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Confirm Password
//                   </label>
//                   {renderPasswordInput('confirm_password', passwordSetup.confirm_password, handlePasswordSetupChange, 'Confirm your password', 'confirmPassword')}
//                 </div>

//                 <button 
//                   type="submit"
//                   disabled={loading}
//                   className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//                 >
//                   {loading ? 'Setting Password...' : 'Set Password'}
//                 </button>
//               </>
//             )}
//           </form>
//         ) : (
//           <form onSubmit={handleResetPassword} className="space-y-4">
//             <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
//               <p className="text-sm text-orange-800">
//                 <strong>Reset Password:</strong> Enter your child's information to reset your parent account password.
//               </p>
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Child's Full Name
//               </label>
//               <input 
//                 type="text" 
//                 name="student_name"
//                 value={passwordReset.student_name}
//                 onChange={handlePasswordResetChange}
//                 className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                 placeholder="Enter your child's full name exactly as registered"
//                 disabled={loading}
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
//               {loadingSchools ? (
//                 <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 flex items-center">
//                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
//                   Loading schools...
//                 </div>
//               ) : schools.length > 0 ? (
//                 <select 
//                   name="school_name"
//                   value={passwordReset.school_name}
//                   onChange={handlePasswordResetChange}
//                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
//                   disabled={loading}
//                 >
//                   <option value="">Select your child's school</option>
//                   {schools.map((school) => (
//                     <option key={school.id} value={school.name}>
//                       {school.name}{school.location ? ` - ${school.location}` : ''}
//                     </option>
//                   ))}
//                 </select>
//               ) : (
//                 <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
//                   No active schools found. 
//                   <button 
//                     type="button" 
//                     onClick={loadSchools}
//                     className="ml-2 text-blue-600 underline hover:text-blue-800"
//                   >
//                     Try again
//                   </button>
//                 </div>
//               )}
//             </div>

//             <div>
//               <button 
//                 type="button"
//                 onClick={() => checkPasswordStatus(true)}
//                 disabled={loading || !passwordReset.student_name || !passwordReset.school_name || schools.length === 0}
//                 className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//               >
//                 {loading ? 'Checking...' : 'Verify Student'}
//               </button>
//             </div>

//             {message && (
//               <>
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     New Password
//                   </label>
//                   {renderPasswordInput('new_password', passwordReset.new_password, handlePasswordResetChange, 'Enter new password (6+ characters)', 'resetNewPassword')}
//                 </div>

//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Confirm New Password
//                   </label>
//                   {renderPasswordInput('confirm_password', passwordReset.confirm_password, handlePasswordResetChange, 'Confirm your new password', 'resetConfirmPassword')}
//                 </div>

//                 <button 
//                   type="submit"
//                   disabled={loading}
//                   className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
//                 >
//                   {loading ? 'Resetting Password...' : 'Reset Password'}
//                 </button>
//               </>
//             )}
//           </form>
//         )}

//         <div className="mt-6 text-xs text-gray-500 space-y-1">
//           <p><strong>Instructions:</strong></p>
//           <p><strong>Parents:</strong> First time? Use "First Time?" tab. Forgot password? Use "Reset Password" tab.</p>
//           <p><strong>Staff:</strong> Use your admin username and password.</p>
//           <p><strong>Demo Admin:</strong> mainadmin / admin123</p>
//         </div>
//       </div>
//     </div>
//   )
// }

import { useState, useEffect } from 'react'

export default function LoginScreen({ onLogin }) {
  const [currentView, setCurrentView] = useState('login') // 'login', 'set-password', 'reset-password'
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    school_name: '' // Added for parent login
  })
  const [passwordSetup, setPasswordSetup] = useState({
    student_name: '',
    school_name: '',
    new_password: '',
    confirm_password: ''
  })
  const [passwordReset, setPasswordReset] = useState({
    student_name: '',
    school_name: '',
    new_password: '',
    confirm_password: ''
  })
  const [schools, setSchools] = useState([])
  const [loadingSchools, setLoadingSchools] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [showSchoolSelector, setShowSchoolSelector] = useState(false) // For login form
  
  // Password visibility states
  const [showPasswords, setShowPasswords] = useState({
    loginPassword: false,
    newPassword: false,
    confirmPassword: false,
    resetNewPassword: false,
    resetConfirmPassword: false
  })

  // Load schools when switching to any view that needs them
  useEffect(() => {
    if ((currentView === 'set-password' || currentView === 'reset-password' || showSchoolSelector) && schools.length === 0) {
      loadSchools()
    }
  }, [currentView, showSchoolSelector])

  const loadSchools = async () => {
    setLoadingSchools(true)
    setError('')
    
    try {
      const response = await fetch('/api/schools')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success && result.data) {
        const activeSchools = result.data
          .filter(school => school.status === 'active')
          .map(school => ({
            id: school.school_id,
            name: school.name,
            location: school.location
          }))
        
        setSchools(activeSchools)
        
        if (activeSchools.length > 0) {
          setPasswordSetup(prev => ({ ...prev, school_name: activeSchools[0].name }))
          setPasswordReset(prev => ({ ...prev, school_name: activeSchools[0].name }))
        }
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Failed to load schools:', error)
      setError('Failed to load schools. Please try again.')
    } finally {
      setLoadingSchools(false)
    }
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handlePasswordSetupChange = (e) => {
    setPasswordSetup({
      ...passwordSetup,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handlePasswordResetChange = (e) => {
    setPasswordReset({
      ...passwordReset,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const clearMessages = () => {
    setError('')
    setMessage('')
  }

  const switchView = (view) => {
    setCurrentView(view)
    setShowSchoolSelector(false)
    setFormData({
      username: '',
      password: '',
      school_name: ''
    })
    clearMessages()
  }

// Check if username might be a student name and show school selector
const checkForSchoolSelection = async () => {
  if (!formData.username.trim()) {
    setError('Please enter a username')
    return
  }

  // If it's clearly an admin username (contains admin, no spaces, etc.), skip school check
  if (formData.username.toLowerCase().includes('admin') || 
      !formData.username.includes(' ') ||
      formData.username.length < 3) {
    setShowSchoolSelector(false)
    return
  }

  setLoading(true)
  setError('')

  try {
    const response = await fetch('/api/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'check_student_schools',
        student_name: formData.username
      }),
    })

    const data = await response.json()

    if (response.ok && data.schools && data.schools.length > 1) {
      // Multiple schools found, UPDATE THE SCHOOLS STATE with the specific schools
      setSchools(data.schools)
      setShowSchoolSelector(true)
      setMessage(`Found "${formData.username}" in ${data.schools.length} schools. Please select the correct school.`)
    } else if (response.ok && data.schools && data.schools.length === 1) {
      // Only one school found, auto-select it
      setSchools(data.schools)
      setFormData(prev => ({ ...prev, school_name: data.schools[0].name }))
      setShowSchoolSelector(false)
    } else {
      // No schools found or error, proceed without school selector
      setShowSchoolSelector(false)
    }
  } catch (error) {
    // If check fails, proceed without school selector
    setShowSchoolSelector(false)
  } finally {
    setLoading(false)
  }
}

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!formData.username || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    // If school selector is shown but no school selected
    if (showSchoolSelector && !formData.school_name) {
      setError('Please select your child\'s school')
      return
    }

    setLoading(true)
    setError('')

    try {
      const loginData = {
        action: 'login',
        username: formData.username,
        password: formData.password
      }

      // Include school information if it's a parent login
      if (formData.school_name) {
        const selectedSchool = schools.find(school => school.name === formData.school_name)
        if (selectedSchool) {
          loginData.school_id = selectedSchool.id
        }
      }

      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      onLogin(data.user, data.token)
    } catch (error) {
      if (error.message.includes('Invalid credentials')) {
        setError('Invalid username or password. If you\'re a parent, make sure you\'ve set up your password first.')
      } else if (error.message.includes('Multiple students found')) {
        setError('Multiple students found with this name. Please select the correct school.')
        setShowSchoolSelector(true)
      } else {
        setError(error.message || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const checkPasswordStatus = async (isReset = false) => {
    const data = isReset ? passwordReset : passwordSetup
    
    if (!data.student_name || !data.school_name) {
      setError('Please enter student name and select school')
      return
    }

    const selectedSchool = schools.find(school => school.name === data.school_name)
    if (!selectedSchool) {
      setError('Please select a valid school')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_password_status',
          student_name: data.student_name,
          school_id: selectedSchool.id
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Student not found')
      }
      
      if (isReset) {
        if (!result.password_set) {
          setError('No password is set for this student. Please use "First Time? Set Password" instead.')
        } else {
          setMessage(`Student found: ${result.student_name} (${result.grade}) at ${result.school_name}. You can now reset the password.`)
        }
      } else {
        if (result.password_set) {
          setError('Password already set for this student. Please use the login form or reset password if forgotten.')
        } else {
          setMessage(`Student found: ${result.student_name} (${result.grade}) at ${result.school_name}. You can now set a password.`)
        }
      }
    } catch (error) {
      setError(error.message || 'Student not found')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPassword = async (e) => {
    e.preventDefault()

    if (!passwordSetup.student_name || !passwordSetup.school_name || 
        !passwordSetup.new_password || !passwordSetup.confirm_password) {
      setError('Please fill in all fields')
      return
    }

    if (passwordSetup.new_password !== passwordSetup.confirm_password) {
      setError('Passwords do not match')
      return
    }

    if (passwordSetup.new_password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    const selectedSchool = schools.find(school => school.name === passwordSetup.school_name)
    if (!selectedSchool) {
      setError('Please select a valid school')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'set_password',
          student_name: passwordSetup.student_name,
          school_id: selectedSchool.id,
          new_password: passwordSetup.new_password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set password')
      }
      
      setMessage('Password set successfully! You can now login with your child\'s name and the password you just created.')
      setCurrentView('login')
      setFormData({ ...formData, username: passwordSetup.student_name })
      setPasswordSetup({
        student_name: '',
        school_name: schools.length > 0 ? schools[0].name : '',
        new_password: '',
        confirm_password: ''
      })
      setShowPasswords({
        loginPassword: false,
        newPassword: false,
        confirmPassword: false,
        resetNewPassword: false,
        resetConfirmPassword: false
      })
    } catch (error) {
      setError(error.message || 'Failed to set password')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()

    if (!passwordReset.student_name || !passwordReset.school_name || 
        !passwordReset.new_password || !passwordReset.confirm_password) {
      setError('Please fill in all fields')
      return
    }

    if (passwordReset.new_password !== passwordReset.confirm_password) {
      setError('Passwords do not match')
      return
    }

    if (passwordReset.new_password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    const selectedSchool = schools.find(school => school.name === passwordReset.school_name)
    if (!selectedSchool) {
      setError('Please select a valid school')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reset_password',
          student_name: passwordReset.student_name,
          school_id: selectedSchool.id,
          new_password: passwordReset.new_password
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }
      
      setMessage('Password reset successfully! You can now login with your child\'s name and the new password.')
      setCurrentView('login')
      setFormData({ ...formData, username: passwordReset.student_name })
      setPasswordReset({
        student_name: '',
        school_name: schools.length > 0 ? schools[0].name : '',
        new_password: '',
        confirm_password: ''
      })
      setShowPasswords({
        loginPassword: false,
        newPassword: false,
        confirmPassword: false,
        resetNewPassword: false,
        resetConfirmPassword: false
      })
    } catch (error) {
      setError(error.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  const renderPasswordInput = (type, value, onChange, placeholder, showPasswordKey, minLength = 6) => (
    <div className="relative">
      <input 
        type={showPasswords[showPasswordKey] ? "text" : "password"}
        name={type}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        placeholder={placeholder}
        disabled={loading}
        minLength={minLength}
      />
      <button
        type="button"
        onClick={() => togglePasswordVisibility(showPasswordKey)}
        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
        disabled={loading}
      >
        {showPasswords[showPasswordKey] ? (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464a10.007 10.007 0 00-5.411 8.536M9.878 9.878L12 12m6.121-6.121A10.007 10.007 0 0112 5c-4.478 0-8.268 2.943-9.543 7a9.97 9.97 0 011.563 3.029m5.858.908l4.242 4.242m0 0a3 3 0 01-4.243-4.243m4.243 4.243L21.536 21.536" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">DIAMOND ATTENDANCE</h1>
          <p className="text-gray-600">Multi-School Attendance System</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        <div className="mb-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => switchView('login')}
              className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
                currentView === 'login'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => switchView('set-password')}
              className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
                currentView === 'set-password'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              First Time?
            </button>
            <button
              onClick={() => switchView('reset-password')}
              className={`flex-1 py-2 px-1 text-sm font-medium border-b-2 ${
                currentView === 'reset-password'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Reset Password
            </button>
          </div>
        </div>

        {currentView === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
                <span className="text-gray-400 text-xs ml-1">(Admin username or Child's full name for parents)</span>
              </label>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter username or child's name"
                  disabled={loading}
                />
                {!showSchoolSelector && formData.username && (
                  <button
                    type="button"
                    onClick={checkForSchoolSelection}
                    disabled={loading}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm whitespace-nowrap"
                  >
                    {loading ? '...' : 'Check'}
                  </button>
                )}
              </div>
            </div>

            {showSchoolSelector && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School
                  <span className="text-gray-400 text-xs ml-1">(Select your child's school)</span>
                </label>
                {loadingSchools ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                    Loading schools...
                  </div>
                ) : schools.length > 0 ? (
                  <select 
                    name="school_name"
                    value={formData.school_name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={loading}
                  >
                    <option value="">Select your child's school</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.name}>
                        {school.name}{school.location ? ` - ${school.location}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
                    No active schools found. 
                    <button 
                      type="button" 
                      onClick={loadSchools}
                      className="ml-2 text-blue-600 underline hover:text-blue-800"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
                <button
                  type="button"
                  onClick={() => switchView('reset-password')}
                  className="text-indigo-600 hover:text-indigo-800 text-xs ml-2 underline"
                >
                  Forgot password?
                </button>
              </label>
              {renderPasswordInput('password', formData.password, handleInputChange, 'Enter password', 'loginPassword', 1)}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : currentView === 'set-password' ? (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <p className="text-sm text-blue-800">
                <strong>First time parent?</strong> Set up your password to access your child's attendance records.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child's Full Name
              </label>
              <input 
                type="text" 
                name="student_name"
                value={passwordSetup.student_name}
                onChange={handlePasswordSetupChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your child's full name exactly as registered"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
              {loadingSchools ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                  Loading schools...
                </div>
              ) : schools.length > 0 ? (
                <select 
                  name="school_name"
                  value={passwordSetup.school_name}
                  onChange={handlePasswordSetupChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="">Select your child's school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.name}>
                      {school.name}{school.location ? ` - ${school.location}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
                  No active schools found. 
                  <button 
                    type="button" 
                    onClick={loadSchools}
                    className="ml-2 text-blue-600 underline hover:text-blue-800"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            <div>
              <button 
                type="button"
                onClick={() => checkPasswordStatus(false)}
                disabled={loading || !passwordSetup.student_name || !passwordSetup.school_name || schools.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {loading ? 'Checking...' : 'Check Student'}
              </button>
            </div>

            {message && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  {renderPasswordInput('new_password', passwordSetup.new_password, handlePasswordSetupChange, 'Enter new password (6+ characters)', 'newPassword')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  {renderPasswordInput('confirm_password', passwordSetup.confirm_password, handlePasswordSetupChange, 'Confirm your password', 'confirmPassword')}
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
                >
                  {loading ? 'Setting Password...' : 'Set Password'}
                </button>
              </>
            )}
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-sm text-orange-800">
                <strong>Reset Password:</strong> Enter your child's information to reset your parent account password.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child's Full Name
              </label>
              <input 
                type="text" 
                name="student_name"
                value={passwordReset.student_name}
                onChange={handlePasswordResetChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter your child's full name exactly as registered"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">School</label>
              {loadingSchools ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                  Loading schools...
                </div>
              ) : schools.length > 0 ? (
                <select 
                  name="school_name"
                  value={passwordReset.school_name}
                  onChange={handlePasswordResetChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                >
                  <option value="">Select your child's school</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.name}>
                      {school.name}{school.location ? ` - ${school.location}` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-3 py-2 border border-red-300 rounded-md bg-red-50 text-red-600">
                  No active schools found. 
                  <button 
                    type="button" 
                    onClick={loadSchools}
                    className="ml-2 text-blue-600 underline hover:text-blue-800"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>

            <div>
              <button 
                type="button"
                onClick={() => checkPasswordStatus(true)}
                disabled={loading || !passwordReset.student_name || !passwordReset.school_name || schools.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
              >
                {loading ? 'Checking...' : 'Verify Student'}
              </button>
            </div>

            {message && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  {renderPasswordInput('new_password', passwordReset.new_password, handlePasswordResetChange, 'Enter new password (6+ characters)', 'resetNewPassword')}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  {renderPasswordInput('confirm_password', passwordReset.confirm_password, handlePasswordResetChange, 'Confirm your new password', 'resetConfirmPassword')}
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white py-2 px-4 rounded-md font-medium transition-colors"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </>
            )}
          </form>
        )}

        <div className="mt-6 text-xs text-gray-500 space-y-1">
          <p><strong>Instructions:</strong></p>
          <p><strong>Parents:</strong> Enter child's name, click "Check" to select school if multiple found. First time? Use "First Time?" tab.</p>
          <p><strong>Staff:</strong> Use your admin username and password.</p>
          <p><strong>Demo Admin:</strong> mainadmin / admin123</p>
        </div>
      </div>
    </div>
  )
}