import React from 'react';

function useOutsideAlerter(ref: any, setX: any): void {
  React.useEffect(() => {
    /**
     * Alert if clicked on outside of element
     */
    // function handleClickOutside(event: React.MouseEvent<HTMLElement>) {
    function handleClickOutside(event: any) {
      if (ref.current && !ref.current.contains(event.target)) {
        setX(false);
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, setX]);
}

const Dropdown = (props: {
  button: JSX.Element;
  children: JSX.Element;
  classNames: string;
  animation?: string;
}) => {
  const { button, children, classNames, animation } = props;
  const wrapperRef = React.useRef(null);
  const [openWrapper, setOpenWrapper] = React.useState(false);
  useOutsideAlerter(wrapperRef, setOpenWrapper);

  return (
    <div ref={wrapperRef} className="relative flex w-full">
      <div
        className="flex w-full"
        onMouseDown={() => setOpenWrapper(!openWrapper)}
      >
        {button}
      </div>
      <div
        className={`${classNames} absolute z-10 ${
          animation
            ? animation
            : 'origin-top-right transition-all duration-300 ease-in-out'
        } ${
          openWrapper 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default Dropdown;
