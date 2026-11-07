public class Q20DivisibleTests
{
    [Theory(DisplayName = "Q20 割り切れるか")]
    [InlineData("9 3\n", "Yes\n")]
    [InlineData("10 3\n", "No\n")]
    [InlineData("0 5\n", "Yes\n")]
    public void Q20Divisible(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q20Divisible())));
    }
}
