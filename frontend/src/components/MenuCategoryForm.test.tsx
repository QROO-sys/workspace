import { render, fireEvent } from "@testing-library/react"
import MenuCategoryForm from "./MenuCategoryForm"

test("submits form with name", async () => {
  const onCreate = jest.fn();
  const { getByPlaceholderText, getByText } = render(<MenuCategoryForm onCreate={onCreate} />);
  fireEvent.change(getByPlaceholderText("Category name"), { target: { value: "Starters" } });
  fireEvent.click(getByText("Add"));
  // You'd mock fetch here; test onCreate called or side effect
});