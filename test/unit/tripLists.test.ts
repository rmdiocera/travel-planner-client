import { describe, expect, it } from 'vitest'
import { NOTE_DELETE_TEXT, checklistDeleteText, listDeleteText } from '../../app/utils/trip/deleteText'
import { onDaysLabel } from '../../app/utils/trip/onDays'

describe('onDaysLabel', () => {
  it('has no label for a place on no day', () => {
    expect(onDaysLabel([])).toBeNull()
  })

  it('names one day', () => {
    expect(onDaysLabel([2])).toBe('On day 2')
  })

  it('joins several days', () => {
    expect(onDaysLabel([1, 7])).toBe('On days 1 and 7')
    expect(onDaysLabel([1, 3, 7])).toBe('On days 1, 3 and 7')
  })
})

describe('listDeleteText', () => {
  it('says what goes with the list', () => {
    expect(listDeleteText('Before we go', { places: 0, checklists: 2, notes: 1 })).toEqual({
      title: 'Delete "Before we go"?',
      body: 'Its 2 checklists and 1 note will be deleted too. This can\'t be undone.',
    })
  })

  it('lists every kind with commas and "and"', () => {
    expect(listDeleteText('Food', { places: 3, checklists: 1, notes: 2 }).body)
      .toBe('Its 3 places, 1 checklist and 2 notes will be deleted too. This can\'t be undone.')
  })

  it('says only that it can\'t be undone for an empty list', () => {
    expect(listDeleteText('Empty', { places: 0, checklists: 0, notes: 0 }).body).toBe('This can\'t be undone.')
  })
})

describe('checklistDeleteText', () => {
  it('names the checklist and counts its items', () => {
    expect(checklistDeleteText('Packing', 5)).toEqual({
      title: 'Delete "Packing"?',
      body: 'Its 5 items will be deleted too. This can\'t be undone.',
    })
  })

  it('has a generic title without a title, and uses the singular', () => {
    expect(checklistDeleteText(null, 1)).toEqual({
      title: 'Delete this checklist?',
      body: 'Its 1 item will be deleted too. This can\'t be undone.',
    })
  })

  it('says only that it can\'t be undone for an empty checklist', () => {
    expect(checklistDeleteText(null, 0).body).toBe('This can\'t be undone.')
  })
})

describe('NOTE_DELETE_TEXT', () => {
  it('asks about the note', () => {
    expect(NOTE_DELETE_TEXT).toEqual({ title: 'Delete this note?', body: 'This can\'t be undone.' })
  })
})
