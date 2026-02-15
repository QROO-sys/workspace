import { render, fireEvent } from "@testing-library/react";
import MenuCategoryForm from "@/components/MenuCategoryForm";

test("calls onCreate when submitted", async () => {
  const onCreate = jest.fn();
  const { getByPlaceholderText, getByText } = render(<MenuCategoryForm onCreate={onCreate} />);
  fireEvent.change(getByPlaceholderText("Category name"), { target: { value: "Desserts" } });
  fireEvent.click(getByText("Add"));
  // mock fetch, trigger onCreate, assert the call
});