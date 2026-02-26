"use client";

import { Button } from "@/components/ui/button";
import { useAuthClick } from "@/lib/domains/auth/use-auth-click";
import {
  forwardRef,
  type ComponentProps,
  type ForwardedRef,
  type MouseEvent,
  type ReactNode,
} from "react";

type ButtonComponentProps = ComponentProps<typeof Button>;

interface AuthButtonProps extends Omit<ButtonComponentProps, "onClick"> {
  onClick?: ButtonComponentProps["onClick"];
  onConnect?: () => void;
  connectLabel?: ReactNode;
}

export const AuthButton = forwardRef(function AuthButton(
  {
    onConnect,
    onClick,
    children,
    connectLabel,
    disabled,
    type = "button",
    ...rest
  }: AuthButtonProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const { handleClick, address } = useAuthClick(onConnect);

  function handleButtonClick(event: MouseEvent<HTMLButtonElement>) {
    const shouldProceed = handleClick(event);
    if (shouldProceed && onClick) {
      onClick(event);
    }
  }

  const isConnectState = !address;
  const disableForState = isConnectState ? false : Boolean(disabled);
  const content = isConnectState && connectLabel ? connectLabel : children;

  return (
    <Button ref={ref} type={type} disabled={disableForState} onClick={handleButtonClick} {...rest}>
      {content}
    </Button>
  );
});
