public class S08PrintTailsTests
{
    [Theory(DisplayName = "S08 末尾を集める")]
    [InlineData("2\nabc\nXY\n", "c\nY\n")]
    [InlineData("1\nA\n", "A\n")]
    public void S08PrintTails(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S08PrintTails())));
    }
}
