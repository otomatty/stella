public class Q08MultipleOf3Tests
{
    [Theory(DisplayName = "Q08 3の倍数")]
    [InlineData("9\n", "Yes\n")]
    [InlineData("10\n", "No\n")]
    [InlineData("0\n", "Yes\n")]
    public void Q08MultipleOf3(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q08MultipleOf3())));
    }
}
