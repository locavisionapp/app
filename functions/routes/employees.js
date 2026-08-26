const crypto = require('crypto')
const express = require('express')
const { db, auth } = require('../lib/db')
const { requireRole } = require('../lib/auth')
const { asyncRoute, ApiError } = require('../lib/asyncRoute')
const { synthesizeEmail } = require('../lib/slug')
const { SYNTHETIC_EMAIL_DOMAIN } = require('../lib/config')

const router = express.Router()
const adminOnly = requireRole('company_admin')
const companyRole = requireRole('company_admin', 'employee')

function usersCol() {
  return db.collection('users')
}

router.get(
  '/employees',
  companyRole,
  asyncRoute(async (req, res) => {
    const snap = await usersCol().where('companyId', '==', req.auth.companyId).get()
    res.json(snap.docs.map((d) => ({ uid: d.id, ...d.data() })))
  })
)

router.post(
  '/employees',
  adminOnly,
  asyncRoute(async (req, res) => {
    const username = String(req.body?.username || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    const role = req.body?.role === 'company_admin' ? 'company_admin' : 'employee'
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw new ApiError(400, "Nom d'utilisateur invalide (3-30 caractères, lettres/chiffres/._-).")
    if (password.length < 8) throw new ApiError(400, 'Le mot de passe doit faire au moins 8 caractères.')

    const companyDoc = await db.collection('companies').doc(req.auth.companyId).get()
    const slug = companyDoc.data()?.slug
    if (!slug) throw new ApiError(400, "Cette entreprise n'a pas d'identifiant configuré.")

    const existing = await usersCol().where('companyId', '==', req.auth.companyId).where('username', '==', username).limit(1).get()
    if (!existing.empty) throw new ApiError(409, "Ce nom d'utilisateur existe déjà pour cette entreprise.")

    const email = synthesizeEmail(slug, username, SYNTHETIC_EMAIL_DOMAIN)
    const userRecord = await auth.createUser({ email, password, displayName: username })
    await usersCol().doc(userRecord.uid).set({
      companyId: req.auth.companyId,
      username,
      role,
      active: true,
      createdAt: Date.now(),
    })

    res.status(201).json({ uid: userRecord.uid, username, role, active: true })
  })
)

router.put(
  '/employees/:uid',
  adminOnly,
  asyncRoute(async (req, res) => {
    const ref = usersCol().doc(req.params.uid)
    const doc = await ref.get()
    if (!doc.exists || doc.data().companyId !== req.auth.companyId) throw new ApiError(404, 'Employé introuvable.')
    if (req.params.uid === req.auth.uid && req.body?.active === false) throw new ApiError(400, 'Vous ne pouvez pas désactiver votre propre compte.')

    const updates = {}
    if (req.body?.role === 'company_admin' || req.body?.role === 'employee') updates.role = req.body.role
    if (typeof req.body?.active === 'boolean') updates.active = req.body.active
    await ref.set(updates, { merge: true })
    res.json({ uid: doc.id, ...doc.data(), ...updates })
  })
)

router.post(
  '/employees/:uid/reset-password',
  adminOnly,
  asyncRoute(async (req, res) => {
    const doc = await usersCol().doc(req.params.uid).get()
    if (!doc.exists || doc.data().companyId !== req.auth.companyId) throw new ApiError(404, 'Employé introuvable.')

    const newPassword = crypto.randomBytes(9).toString('base64url')
    await auth.updateUser(req.params.uid, { password: newPassword })
    res.json({ password: newPassword })
  })
)

router.delete(
  '/employees/:uid',
  adminOnly,
  asyncRoute(async (req, res) => {
    if (req.params.uid === req.auth.uid) throw new ApiError(400, 'Vous ne pouvez pas supprimer votre propre compte.')
    const doc = await usersCol().doc(req.params.uid).get()
    if (!doc.exists || doc.data().companyId !== req.auth.companyId) throw new ApiError(404, 'Employé introuvable.')

    await auth.deleteUser(req.params.uid).catch((e) => console.warn('[employees] auth.deleteUser failed', e.message))
    await doc.ref.delete()
    res.status(204).end()
  })
)

module.exports = router
