public class Q12Product2Tests
{
    [Theory(DisplayName = "Q12 2つの積")]
    [InlineData("3 10\n", "30\n")]
    [InlineData("0 5\n", "0\n")]
    [InlineData("-2 4\n", "-8\n")]
    public void Q12Product2(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.Q12Product2())));
    }
}
