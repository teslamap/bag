import { useState } from 'react';
import { KeyRound, Pencil, Plus, ShieldCheck, UserCog, UserRoundCheck } from 'lucide-react';
import { useBackendSnapshot } from '@/state/backend';
import { backend } from '@/backend';
import { toast } from '@/state/toast';
import { errorMessage } from '@/lib/errors';
import {
  AdminButton,
  AdminCheckbox,
  AdminEmpty,
  AdminInput,
  AdminModal,
  AdminPageHeader,
  AdminPanel,
  AdminSelect,
  AdminStat,
  TableWrap,
} from '@/components/admin/AdminUI';
import { employeeSchema, fieldErrors } from '@/lib/validation';
import { getFullName, getInitials, formatDate } from '@/lib/utils';
import { MANAGER_DEFAULT_PERMISSIONS, PERMISSION_LABELS, ROLE_LABELS } from '@/lib/constants';
import type { EmployeeDraft, StaffPermission, User } from '@/lib/types';

interface EmployeeForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'manager' | 'admin';
  permissions: StaffPermission[];
  status: 'active' | 'suspended';
  password: string;
}

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as StaffPermission[];

function emptyForm(): EmployeeForm {
  return {
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'manager',
    permissions: [...MANAGER_DEFAULT_PERMISSIONS],
    status: 'active',
    password: '',
  };
}

function formFromUser(user: User): EmployeeForm {
  return {
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role === 'admin' ? 'admin' : 'manager',
    permissions: user.permissions,
    status: user.status,
    password: '',
  };
}

export function AdminEmployeesPage() {
  const snapshot = useBackendSnapshot();
  const [editing, setEditing] = useState<User | 'new' | null>(null);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);

  const staff = snapshot.users.filter((user) => user.role !== 'customer');

  const openNew = () => {
    setForm(emptyForm());
    setErrors({});
    setEditing('new');
  };

  const openEdit = (user: User) => {
    setForm(formFromUser(user));
    setErrors({});
    setEditing(user);
  };

  const togglePermission = (permission: StaffPermission) => {
    setForm((current) => ({
      ...current,
      permissions: current.permissions.includes(permission)
        ? current.permissions.filter((entry) => entry !== permission)
        : [...current.permissions, permission],
    }));
  };

  const setRole = (role: 'manager' | 'admin') => {
    setForm((current) => ({
      ...current,
      role,
      permissions: role === 'admin' ? ALL_PERMISSIONS : current.permissions.length ? current.permissions : [...MANAGER_DEFAULT_PERMISSIONS],
    }));
  };

  const save = async () => {
    const draft: EmployeeDraft & { password?: string } = {
      id: editing && editing !== 'new' ? editing.id : undefined,
      email: form.email.trim(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim(),
      role: form.role,
      permissions: form.role === 'admin' ? ALL_PERMISSIONS : form.permissions,
      status: form.status,
      password: form.password.trim() || undefined,
    };
    const parsed = employeeSchema.safeParse(draft);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    if (editing === 'new' && !form.password.trim()) {
      setErrors({ password: 'შეიყვანეთ დროებითი პაროლი.' });
      return;
    }
    setSaving(true);
    setErrors({});
    try {
      if (editing === 'new') {
        await backend.createEmployee({ ...draft, password: form.password.trim() });
        toast('თანამშრომელი შეიქმნა', { message: `${draft.firstName} ${draft.lastName}` });
      } else if (editing) {
        await backend.updateEmployee(editing.id, draft);
        toast('თანამშრომელი განახლდა', { message: `${draft.firstName} ${draft.lastName}` });
      }
      setEditing(null);
    } catch (error) {
      toast('ვერ შეინახა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!confirm) return;
    setUpdating(true);
    try {
      const next = confirm.status === 'active' ? 'suspended' : 'active';
      await backend.setUserStatus(confirm.id, next);
      toast(next === 'suspended' ? 'თანამშრომელი შეჩერდა' : 'თანამშრომელი აღდგა', { message: getFullName(confirm) });
      setConfirm(null);
    } catch (error) {
      toast('ვერ შეიცვალა', { message: errorMessage(error), variant: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        eyebrow="ადამიანები"
        title="თანამშრომლები"
        description="როლები და წვდომები. მხოლოდ ადმინისტრატორს შეუძლია პერსონალის შექმნა ან პრივილეგიების შეცვლა; ყოველი ცვლილება ფიქსირდება აუდიტის ჟურნალში."
        actions={<AdminButton size="sm" leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden />} onClick={openNew}>ახალი თანამშრომელი</AdminButton>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="პერსონალი" value={staff.length} sub={`${staff.filter((user) => user.role === 'manager').length} მენეჯერი`} icon={<UserCog className="h-4 w-4" aria-hidden />} />
        <AdminStat label="ადმინისტრატორი" value={staff.filter((user) => user.role === 'admin').length} sub="სრული წვდომა" icon={<ShieldCheck className="h-4 w-4" aria-hidden />} accent="warning" />
        <AdminStat label="აქტიური სესიები" value={staff.filter((user) => user.status === 'active').length} sub="შეჩერებულები ვერ შედიან" icon={<UserRoundCheck className="h-4 w-4" aria-hidden />} accent="success" />
      </div>

      <AdminPanel noPadding>
        <div className="hidden md:block">
          <TableWrap>
            <table className="admin-table w-full min-w-[780px]">
              <thead><tr><th>თანამშრომელი</th><th>როლი</th><th>წვდომები</th><th>სტატუსი</th><th>ბოლო შესვლა</th><th /></tr></thead>
              <tbody>
                {staff.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#c6aa82]/12 text-[8px] font-medium text-[var(--tone-accent-text)]">{getInitials(user.firstName, user.lastName)}</span>
                        <div>
                          <p className="text-[11px] font-medium">{getFullName(user)}</p>
                          <p className="mt-0.5 text-[9px] text-[var(--text-secondary)]">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={user.role === 'admin' ? 'text-[10px] text-[var(--tone-accent-text)]' : 'text-[10px] text-[var(--text-primary)]'}>{ROLE_LABELS[user.role]}</span>
                    </td>
                    <td>
                      <div className="flex max-w-64 flex-wrap gap-1">
                        {user.role === 'admin' ? (
                          <span className="rounded border border-[#c6aa82]/25 bg-[#c6aa82]/[0.06] px-1.5 py-0.5 text-[8px] text-[var(--tone-accent-text)]">სრული წვდომა</span>
                        ) : user.permissions.length ? (
                          user.permissions.map((permission) => (
                            <span key={permission} className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[8px] text-[var(--text-secondary)]">{PERMISSION_LABELS[permission]}</span>
                          ))
                        ) : (
                          <span className="text-[9px] text-[var(--text-secondary)]">შეზღუდული</span>
                        )}
                      </div>
                    </td>
                    <td><span className={user.status === 'active' ? 'text-[10px] text-[var(--tone-success-text)]' : 'text-[10px] text-[var(--tone-danger-text)]'}>{user.status === 'active' ? 'აქტიური' : 'შეჩერებული'}</span></td>
                    <td className="text-[10px] text-[var(--text-secondary)]">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <AdminButton size="icon" variant="ghost" aria-label="რედაქტირება" onClick={() => openEdit(user)}><Pencil className="h-3 w-3" aria-hidden /></AdminButton>
                        {user.id !== snapshot.session?.id && (
                          <AdminButton size="icon" variant="ghost" aria-label={user.status === 'active' ? 'შეჩერება' : 'აღდგენა'} onClick={() => setConfirm(user)}>
                            <KeyRound className={user.status === 'active' ? 'h-3 w-3 text-[var(--tone-warning-text)]' : 'h-3 w-3 text-[var(--tone-success-text)]'} aria-hidden />
                          </AdminButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
        <ul className="divide-y divide-[var(--line)] md:hidden">
          {staff.map((user) => (
            <li key={user.id} className="px-4 py-3.5">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c6aa82]/12 text-[9px] font-medium text-[var(--tone-accent-text)]">{getInitials(user.firstName, user.lastName)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium">{getFullName(user)}</p>
                    <span className={user.status === 'active' ? 'text-[9px] text-[var(--tone-success-text)]' : 'text-[9px] text-[var(--tone-danger-text)]'}>{user.status === 'active' ? 'აქტიური' : 'შეჩერებული'}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[9px] text-[var(--text-secondary)]">{user.email} · {ROLE_LABELS[user.role]}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(user.role === 'admin' ? ALL_PERMISSIONS : user.permissions).map((permission) => (
                      <span key={permission} className="rounded border border-[var(--line)] px-1.5 py-0.5 text-[8px] text-[var(--text-secondary)]">{PERMISSION_LABELS[permission]}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-1.5">
                    <AdminButton size="sm" variant="secondary" onClick={() => openEdit(user)}>რედაქტირება</AdminButton>
                    {user.id !== snapshot.session?.id && <AdminButton size="sm" variant="ghost" onClick={() => setConfirm(user)}>{user.status === 'active' ? 'შეჩერება' : 'აღდგენა'}</AdminButton>}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {!staff.length && <AdminEmpty title="თანამშრომლები არ არიან" />}
      </AdminPanel>

      <AdminModal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'ახალი თანამშრომელი' : 'თანამშრომლის რედაქტირება'}
        description="როლი განსაზღვრავს სისტემურ წვდომას. მენეჯერის უფლებები შეგიძლიათ შეზღუდოთ ცალკეულ განყოფილებებზე."
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setEditing(null)} disabled={saving}>გაუქმება</AdminButton>
            <AdminButton loading={saving} onClick={() => void save()}>შენახვა</AdminButton>
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <AdminInput label="სახელი" required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} error={errors.firstName} />
          <AdminInput label="გვარი" required value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} error={errors.lastName} />
          <AdminInput label="ელფოსტა" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} error={errors.email} autoComplete="off" />
          <AdminInput label="ტელეფონი" required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} error={errors.phone} />
          <AdminSelect label="როლი" value={form.role} onChange={(event) => setRole(event.target.value as 'manager' | 'admin')} error={errors.role}>
            <option value="manager">მენეჯერი</option>
            <option value="admin">ადმინისტრატორი</option>
          </AdminSelect>
          <AdminSelect label="სტატუსი" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EmployeeForm['status'] })}>
            <option value="active">აქტიური</option>
            <option value="suspended">შეჩერებული</option>
          </AdminSelect>
          <AdminInput
            label={editing === 'new' ? 'დროებითი პაროლი' : 'ახალი პაროლი (არასავალდებულო)'}
            type="password"
            required={editing === 'new'}
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            error={errors.password}
            hint="მინიმუმ 8 სიმბოლო, ასო და ციფრი"
            autoComplete="new-password"
            className="sm:col-span-2"
          />
          <div className="rounded-lg border border-[var(--line)] p-3 sm:col-span-2">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              წვდომები {form.role === 'admin' && <span className="ml-1 normal-case tracking-normal text-[var(--tone-accent-text)]">· ადმინისტრატორს აქვს სრული წვდომა</span>}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {ALL_PERMISSIONS.map((permission) => (
                <AdminCheckbox
                  key={permission}
                  label={PERMISSION_LABELS[permission]}
                  checked={form.role === 'admin' || form.permissions.includes(permission)}
                  onChange={() => togglePermission(permission)}
                  disabled={form.role === 'admin'}
                />
              ))}
            </div>
          </div>
          <p className="flex items-start gap-2 text-[9px] leading-relaxed text-[var(--text-secondary)] sm:col-span-2">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[var(--tone-accent-text)]" aria-hidden />
            მენეჯერი ვერ ხედავს ფინანსურ რეპორტებს, აუდიტის ჟურნალს, პარამეტრებს ან სხვა თანამშრომლების მართვას — მაშინაც კი, თუ ბრაუზერში პირდაპირ URL-ს გახსნის, მონაცემები სერვერზე იფილტრება.
          </p>
        </div>
      </AdminModal>

      <AdminModal
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.status === 'active' ? 'თანამშრომლის შეჩერება' : 'თანამშრომლის აღდგენა'}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <AdminButton variant="secondary" onClick={() => setConfirm(null)} disabled={updating}>გაუქმება</AdminButton>
            <AdminButton variant={confirm?.status === 'active' ? 'danger' : 'success'} loading={updating} onClick={() => void toggleStatus()}>
              {confirm?.status === 'active' ? 'შეჩერება' : 'აღდგენა'}
            </AdminButton>
          </div>
        }
      >
        <p className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
          {confirm?.status === 'active'
            ? `${getFullName(confirm)}-ს წვდომა დროებით შეჩერდება და აქტიური სესიები გაუქმდება.`
            : `${getFullName(confirm ?? { firstName: '', lastName: '' })} კვლავ შეძლებს სისტემაში შესვლას.`}
        </p>
      </AdminModal>
    </div>
  );
}
