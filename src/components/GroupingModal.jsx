import { useState, useMemo } from 'react';

// ─── Design tokens — matches the grid's navy/white palette ───────────────────
const C = {
  navy: '#1a2340',
  navyLight: '#1f2a4a',
  blue1Bg: '#c3d4f5',   // cat1 group row bg (same as grid)
  blue1Text: '#0c0f17',
  blue2Bg: '#dbe6f9',   // cat2 group row bg (same as grid)
  blue2Text: '#16265c',
  white: '#ffffff',
  surface: '#f8fafc',
  border: '#e5e7eb',
  borderMid: '#d1d5db',
  text: '#111827',
  muted: '#6b7280',
  mutedLight: '#9ca3af',
  chipBg: '#f3f4f6',
  assignedBg: '#1a2340',
  assignedText: '#ffffff',
  dropActive: '#eef2fb',
  dropBorder: '#1a2340',
  danger: '#e0291b',
};

const overlay = {
  position: 'fixed', inset: 0, background: 'rgba(15,20,40,0.45)',
  zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const modal = {
  background: C.white, borderRadius: '10px', width: '820px', maxWidth: '96vw',
  maxHeight: '88vh', display: 'flex', flexDirection: 'column',
  boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
  fontFamily: 'system-ui, -apple-system, sans-serif',
};

const header = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '16px 22px', background: C.navy, borderRadius: '10px 10px 0 0',
  borderBottom: `2px solid ${C.navyLight}`,
};

const body = {
  display: 'flex', flex: 1, overflow: 'hidden',
};

const footer = {
  padding: '14px 22px', borderTop: `1px solid ${C.border}`,
  display: 'flex', justifyContent: 'flex-end', gap: '10px',
  background: C.surface,
};

const reorderBtn = (disabled) => ({
  fontSize: '10px', cursor: disabled ? 'default' : 'pointer',
  color: C.muted, background: 'none',
  border: `1px solid ${C.borderMid}`,
  borderRadius: '3px', lineHeight: 1,
  padding: '2px 4px', opacity: disabled ? 0.3 : 1,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
});

// User chip (unassigned panel)
const UserChip = ({ user, onDragStart, onDragEnd }) => (
  <div
    draggable
    onDragStart={() => onDragStart(user)}
    onDragEnd={onDragEnd}
    style={{
      padding: '5px 11px', borderRadius: '4px', fontSize: '15px',
      fontWeight: 500, cursor: 'grab', userSelect: 'none',
      background: C.chipBg, color: C.text, marginBottom: '5px',
      border: `1px solid ${C.borderMid}`, display: 'block',
      letterSpacing: '0.1px',
    }}
  >
    {user}
  </div>
);

// Assigned chip (inside drop zone)
const AssignedChip = ({ user, onRemove, onDragStart, onDragEnd }) => (
  <span
    draggable
    onDragStart={() => onDragStart(user)}
    onDragEnd={onDragEnd}
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 8px 3px 10px', borderRadius: '4px', fontSize: '15px',
      fontWeight: 500, background: C.assignedBg, color: C.assignedText,
      cursor: 'grab', userSelect: 'none',
    }}
  >
    {user}
    <span
      onClick={(e) => { e.stopPropagation(); onRemove(user); }}
      style={{ cursor: 'pointer', opacity: 0.65, fontSize: '14px', lineHeight: 1 }}
    >×</span>
  </span>
);

// Drop zone
const DropZone = ({ users, zoneKey, dragOver, onDragOver, onDragLeave, onDrop, onRemove, onDragStart, onDragEnd }) => {
  const isOver = dragOver === zoneKey;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(zoneKey); }}
      onDragLeave={onDragLeave}
      onDrop={() => onDrop(zoneKey)}
      style={{
        minHeight: '36px', border: `2px dashed ${isOver ? C.dropBorder : C.borderMid}`,
        borderRadius: '5px', padding: '4px 6px',
        display: 'flex', flexWrap: 'wrap', gap: '5px', alignItems: 'center',
        background: isOver ? C.dropActive : 'transparent',
        transition: 'border-color 0.12s, background 0.12s',
        flex: 1,
      }}
    >
      {users.length === 0 && (
        <span style={{ fontSize: '14px', color: C.mutedLight, padding: '2px 4px' }}>
          Drop users here
        </span>
      )}
      {users.map(u => (
        <AssignedChip
          key={u} user={u}
          onRemove={onRemove}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
// Group structure:
//   { id, name, directUsers: [username,...], subGroups: [{ id, name, users: [...] }] }
// directUsers = users sitting at Level 1 (no sub-group)
// subGroups   = Level 2 containers

export default function GroupingModal({ allUsers, initialGroups, onSave, onClose }) {
  const [groups, setGroups] = useState(() => {
    if (initialGroups && initialGroups.length > 0) return initialGroups;
    return [];
  });
  const [newGroupName, setNewGroupName] = useState('');
  const [addingGroup, setAddingGroup] = useState(false);
  const [newSubGroupName, setNewSubGroupName] = useState({});  // gIdx → name
  const [addingSubGroup, setAddingSubGroup] = useState({});     // gIdx → bool
  const [dragUser, setDragUser] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const assignedUsers = useMemo(() => {
    const s = new Set();
    groups.forEach(g => {
      (g.directUsers || []).forEach(u => s.add(u));
      (g.subGroups || []).forEach(sg => (sg.users || []).forEach(u => s.add(u)));
    });
    return s;
  }, [groups]);

  const unassignedUsers = useMemo(() =>
    allUsers.filter(u => !assignedUsers.has(u)).sort(),
    [allUsers, assignedUsers]
  );

  // ── Group management ────────────────────────────────────────────────────────
  const confirmAddGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setGroups(prev => [...prev, { id: Date.now(), name, directUsers: [], subGroups: [] }]);
    setNewGroupName('');
    setAddingGroup(false);
  };

  const deleteGroup = (gIdx) => setGroups(prev => prev.filter((_, i) => i !== gIdx));

  const moveGroup = (gIdx, dir) => {
    setGroups(prev => {
      const next = [...prev];
      const targetIdx = gIdx + dir;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[gIdx], next[targetIdx]] = [next[targetIdx], next[gIdx]];
      return next;
    });
  };

  const moveSubGroup = (gIdx, sIdx, dir) => {
    setGroups(prev => prev.map((g, i) => {
      if (i !== gIdx) return g;
      const next = [...g.subGroups];
      const targetIdx = sIdx + dir;
      if (targetIdx < 0 || targetIdx >= next.length) return g;
      [next[sIdx], next[targetIdx]] = [next[targetIdx], next[sIdx]];
      return { ...g, subGroups: next };
    }));
  };

  const updateGroupName = (gIdx, name) =>
    setGroups(prev => prev.map((g, i) => i === gIdx ? { ...g, name } : g));

  // ── Sub-group management ────────────────────────────────────────────────────
  const confirmAddSubGroup = (gIdx) => {
    const name = (newSubGroupName[gIdx] || '').trim();
    if (!name) return;
    setGroups(prev => prev.map((g, i) => i === gIdx
      ? { ...g, subGroups: [...(g.subGroups || []), { id: Date.now(), name, users: [] }] }
      : g
    ));
    setNewSubGroupName(p => ({ ...p, [gIdx]: '' }));
    setAddingSubGroup(p => ({ ...p, [gIdx]: false }));
  };

  const deleteSubGroup = (gIdx, sIdx) =>
    setGroups(prev => prev.map((g, i) => i === gIdx
      ? { ...g, subGroups: g.subGroups.filter((_, j) => j !== sIdx) }
      : g
    ));

  const updateSubGroupName = (gIdx, sIdx, name) =>
    setGroups(prev => prev.map((g, i) => i === gIdx
      ? { ...g, subGroups: g.subGroups.map((sg, j) => j === sIdx ? { ...sg, name } : sg) }
      : g
    ));

  // ── Remove user from any slot ───────────────────────────────────────────────
  const removeUser = (user) => {
    setGroups(prev => prev.map(g => ({
      ...g,
      directUsers: (g.directUsers || []).filter(u => u !== user),
      subGroups: (g.subGroups || []).map(sg => ({
        ...sg, users: sg.users.filter(u => u !== user),
      })),
    })));
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────
  const onDragStart = (user) => setDragUser(user);
  const onDragEnd = () => { setDragUser(null); setDragOver(null); };

  const onDrop = (zoneKey) => {
    if (!dragUser) return;
    // Remove from everywhere first
    const cleaned = groups.map(g => ({
      ...g,
      directUsers: (g.directUsers || []).filter(u => u !== dragUser),
      subGroups: (g.subGroups || []).map(sg => ({
        ...sg, users: sg.users.filter(u => u !== dragUser),
      })),
    }));

    // zoneKey format: 'direct__{gIdx}' or 'sub__{gIdx}__{sIdx}'
    if (zoneKey.startsWith('direct__')) {
      const gIdx = parseInt(zoneKey.split('__')[1]);
      cleaned[gIdx].directUsers = [...(cleaned[gIdx].directUsers || []), dragUser];
    } else if (zoneKey.startsWith('sub__')) {
      const [, gIdxStr, sIdxStr] = zoneKey.split('__');
      const gIdx = parseInt(gIdxStr), sIdx = parseInt(sIdxStr);
      cleaned[gIdx].subGroups[sIdx].users = [...cleaned[gIdx].subGroups[sIdx].users, dragUser];
    }
    setGroups(cleaned);
    setDragUser(null);
    setDragOver(null);
  };

  const handleSave = () => {
    const cleaned = groups
      .filter(g => g.name.trim())
      .map(g => ({
        ...g,
        name: g.name.trim(),
        directUsers: g.directUsers || [],
        subGroups: (g.subGroups || [])
          .filter(sg => sg.name.trim() || sg.users.length > 0)
          .map(sg => ({ ...sg, name: sg.name.trim() })),
      }));
    onSave(cleaned);
  };

  return (
    <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={header}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff', letterSpacing: '0.2px' }}>
            Grouping
          </span>
          <button onClick={onClose} style={{
            fontSize: '22px', cursor: 'pointer', color: '#fff',
            background: 'none', border: 'none', lineHeight: 1, padding: '0 2px', opacity: 0.8,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={body}>

          {/* Left — unassigned users */}
          <div style={{
            width: '200px', flexShrink: 0, borderRight: `1px solid ${C.border}`,
            display: 'flex', flexDirection: 'column', background: C.surface,
          }}>
            <div style={{
              padding: '10px 14px 8px', fontSize: '13px', fontWeight: 700,
              color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px',
              borderBottom: `1px solid ${C.border}`,
            }}>
              Unassigned
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px' }}>
              {unassignedUsers.length === 0
                ? <div style={{ fontSize: '13px', color: C.mutedLight, padding: '4px 2px' }}>
                    All users assigned
                  </div>
                : unassignedUsers.map(u => (
                  <UserChip key={u} user={u} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                ))
              }
            </div>
          </div>

          {/* Right — groups */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{
              padding: '10px 16px 8px', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', borderBottom: `1px solid ${C.border}`,
              background: C.surface,
            }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Groups
              </span>
              {!addingGroup && (
                <button
                  onClick={() => setAddingGroup(true)}
                  style={{
                    fontSize: '13px', fontWeight: 600, color: C.navy,
                    background: C.blue2Bg, border: `1px solid #b3c8ee`,
                    borderRadius: '4px', padding: '4px 12px', cursor: 'pointer',
                  }}
                >
                  + Add Group
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>

              {/* New group name input */}
              {addingGroup && (
                <div style={{
                  display: 'flex', gap: '8px', marginBottom: '12px',
                  padding: '10px 12px', background: C.blue1Bg,
                  borderRadius: '6px', border: `1px solid #b0c4e8`,
                }}>
                  <input
                    autoFocus
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') confirmAddGroup(); if (e.key === 'Escape') setAddingGroup(false); }}
                    placeholder="Group name..."
                    style={{
                      flex: 1, fontSize: '14px', fontWeight: 600, color: C.text,
                      border: `1px solid ${C.borderMid}`, borderRadius: '4px',
                      padding: '5px 10px', outline: 'none', background: '#fff',
                    }}
                  />
                  <button onClick={confirmAddGroup} style={{
                    fontSize: '13px', fontWeight: 700, color: '#fff', background: C.navy,
                    border: 'none', borderRadius: '4px', padding: '5px 14px', cursor: 'pointer',
                  }}>Add</button>
                  <button onClick={() => { setAddingGroup(false); setNewGroupName(''); }} style={{
                    fontSize: '13px', fontWeight: 600, color: C.muted,
                    background: '#f3f4f6', border: `1px solid ${C.borderMid}`,
                    borderRadius: '4px', padding: '5px 10px', cursor: 'pointer',
                  }}>Cancel</button>
                </div>
              )}

              {groups.length === 0 && !addingGroup && (
                <div style={{ fontSize: '13px', color: C.muted, padding: '32px 0', textAlign: 'center' }}>
                  No groups defined — all users will show without grouping.<br />
                  <span style={{ fontSize: '12px', color: C.mutedLight }}>Click "Add Group" to start.</span>
                </div>
              )}

              {groups.map((g, gIdx) => (
                <div key={g.id} style={{
                  border: `1px solid ${C.borderMid}`, borderRadius: '7px',
                  marginBottom: '12px', overflow: 'hidden',
                }}>

                  {/* ── Level 1 group header (cat1 style) ── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '9px 12px', background: C.blue1Bg,
                    borderBottom: `1px solid #b0c4e8`,
                  }}>
                    <span style={{ fontSize: '14px', color: C.blue1Text, fontWeight: 600, flexShrink: 0 }}>▶</span>
                    <input
                      value={g.name}
                      onChange={e => updateGroupName(gIdx, e.target.value)}
                      style={{
                        flex: 1, fontSize: '14px', fontWeight: 700, color: C.blue1Text,
                        border: 'none', background: 'transparent', outline: 'none', padding: '1px 0',
                      }}
                    />
                    <button onClick={() => moveGroup(gIdx, -1)} disabled={gIdx === 0} style={reorderBtn(gIdx === 0)} title="Move up">▲</button>
                    <button onClick={() => moveGroup(gIdx, 1)} disabled={gIdx === groups.length - 1} style={reorderBtn(gIdx === groups.length - 1)} title="Move down">▼</button>
                    <button onClick={() => deleteGroup(gIdx)} style={{
                      fontSize: '17px', cursor: 'pointer', color: C.muted,
                      background: 'none', border: 'none', lineHeight: 1, padding: '0 2px',
                    }}>×</button>
                  </div>

                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Direct users drop zone (Level 1, no sub-group) */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <span style={{
                        fontSize: '12px', fontWeight: 600, color: C.blue1Text,
                        textTransform: 'uppercase', letterSpacing: '0.4px',
                        paddingTop: '10px', flexShrink: 0, minWidth: '80px',
                      }}>
                        Direct
                      </span>
                      <DropZone
                        users={g.directUsers || []}
                        zoneKey={`direct__${gIdx}`}
                        dragOver={dragOver}
                        onDragOver={setDragOver}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={onDrop}
                        onRemove={removeUser}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                      />
                    </div>

                    {/* ── Level 2 sub-groups (cat2 style) ── */}
                    {(g.subGroups || []).map((sg, sIdx) => (
                      <div key={sg.id} style={{
                        background: C.blue2Bg, borderRadius: '5px',
                        border: `1px solid #b3c8ee`, padding: '8px 10px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '14px', color: C.blue2Text, fontWeight: 600, flexShrink: 0 }}>▶</span>
                          <input
                            value={sg.name}
                            onChange={e => updateSubGroupName(gIdx, sIdx, e.target.value)}
                            placeholder="Sub-group name..."
                            style={{
                              flex: 1, fontSize: '13px', fontWeight: 600, color: C.blue2Text,
                              border: 'none', background: 'transparent', outline: 'none', padding: '1px 0',
                            }}
                          />
                          <button onClick={() => moveSubGroup(gIdx, sIdx, -1)} disabled={sIdx === 0} style={reorderBtn(sIdx === 0)} title="Move up">▲</button>
                          <button onClick={() => moveSubGroup(gIdx, sIdx, 1)} disabled={sIdx === g.subGroups.length - 1} style={reorderBtn(sIdx === g.subGroups.length - 1)} title="Move down">▼</button>
                          <button onClick={() => deleteSubGroup(gIdx, sIdx)} style={{
                            fontSize: '15px', cursor: 'pointer', color: C.muted,
                            background: 'none', border: 'none', lineHeight: 1, padding: '0 2px',
                          }}>×</button>
                        </div>
                        <DropZone
                          users={sg.users || []}
                          zoneKey={`sub__${gIdx}__${sIdx}`}
                          dragOver={dragOver}
                          onDragOver={setDragOver}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={onDrop}
                          onRemove={removeUser}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                        />
                      </div>
                    ))}

                    {/* Add sub-group */}
                    {addingSubGroup[gIdx] ? (
                      <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                        <input
                          autoFocus
                          value={newSubGroupName[gIdx] || ''}
                          onChange={e => setNewSubGroupName(p => ({ ...p, [gIdx]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') confirmAddSubGroup(gIdx); if (e.key === 'Escape') setAddingSubGroup(p => ({ ...p, [gIdx]: false })); }}
                          placeholder="Sub-group name..."
                          style={{
                            flex: 1, fontSize: '14px', fontWeight: 500,
                            border: `1px solid ${C.borderMid}`, borderRadius: '4px',
                            padding: '4px 8px', outline: 'none', background: '#fff',
                          }}
                        />
                        <button onClick={() => confirmAddSubGroup(gIdx)} style={{
                          fontSize: '13px', fontWeight: 700, color: '#fff', background: C.navy,
                          border: 'none', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer',
                        }}>Add</button>
                        <button onClick={() => setAddingSubGroup(p => ({ ...p, [gIdx]: false }))} style={{
                          fontSize: '13px', color: C.muted, background: '#f3f4f6',
                          border: `1px solid ${C.borderMid}`, borderRadius: '4px',
                          padding: '4px 8px', cursor: 'pointer',
                        }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingSubGroup(p => ({ ...p, [gIdx]: true }))}
                        style={{
                          fontSize: '13px', fontWeight: 600, color: C.blue2Text,
                          background: C.blue2Bg, border: `1px solid #b3c8ee`,
                          borderRadius: '4px', padding: '4px 12px', cursor: 'pointer',
                          alignSelf: 'flex-start', marginTop: '2px',
                        }}
                      >
                        + Add Sub-group
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={footer}>
          <button onClick={onClose} style={{
            fontSize: '13px', fontWeight: 600, color: C.muted,
            background: '#f3f4f6', border: `1px solid ${C.borderMid}`,
            borderRadius: '6px', padding: '8px 20px', cursor: 'pointer',
          }}>Cancel</button>
          <button onClick={handleSave} style={{
            fontSize: '13px', fontWeight: 700, color: '#fff',
            background: C.navy, border: 'none',
            borderRadius: '6px', padding: '8px 22px', cursor: 'pointer',
          }}>Save Grouping</button>
        </div>
      </div>
    </div>
  );
}