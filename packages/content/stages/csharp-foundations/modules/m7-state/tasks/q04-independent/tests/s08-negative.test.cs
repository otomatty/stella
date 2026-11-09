public class S08NegativeTests
{
    [Theory(DisplayName = "S08 負の回数")]
    [InlineData("1 4\n-3\n1\n4\n-5\n", "3\n")]
    [InlineData("10 2\n1\n1\n", "0\n")]
    [InlineData("0 1\n-1\n", "1\n")]
    public void S08Negative(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S08Negative())));
    }
}
