import * as React from 'react'
import { screen } from '@testing-library/react'
import { createRender, describeConformance } from 'test/utils'
import TestProvider from '../../test/TestProvider'
import MediaReveal from './MediaReveal'

describe('<MediaReveal />', () => {
  const render = createRender({ wrapper: TestProvider })

  const defaultProps = {
    children: <div />,
  }

  describeConformance(<MediaReveal {...defaultProps} />, () => ({
    ouiName: 'OuiMediaReveal',
    inheritComponent: 'div',
    refInstanceof: window.HTMLDivElement,
    render,
    testComponentPropWith: 'span',
    skip: [
      // https://github.com/facebook/react/issues/11565
      'reactTestRenderer',
    ],
  }))

  it('should render with content of nested children', () => {
    render(
      <MediaReveal data-testid="root">
        <img src="foo.jpg" alt="" data-testid="child" />
      </MediaReveal>,
    )
    expect(screen.getByTestId('root')).not.toHaveAttribute('style')
    expect(screen.getByTestId('child')).toBeInTheDocument()
  })

  describe('should apply the inline style of `--aspect-ratio`', () => {
    it('if `width` & `height` are specified', () => {
      render(<MediaReveal width={2} height={1} data-testid="root" {...defaultProps} />)
      expect(screen.getByTestId('root')).toHaveStyle('--aspect-ratio: 2')
    })

    it('if `ratio` is specified as a number', () => {
      render(<MediaReveal ratio={2} data-testid="root" {...defaultProps} />)
      expect(screen.getByTestId('root')).toHaveStyle('--aspect-ratio: 2')
    })
  })
})
