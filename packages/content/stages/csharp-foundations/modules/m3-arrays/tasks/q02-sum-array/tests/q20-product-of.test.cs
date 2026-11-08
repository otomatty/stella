public class Q20ProductOfTests
{
    [Fact(DisplayName = "Q20 積")]
    public void Q20ProductOf()
    {
        Assert.Equal(24, Answers.Q20ProductOf(new int[] { 1, 2, 3, 4 }));
        Assert.Equal(5, Answers.Q20ProductOf(new int[] { 5 }));
        Assert.Equal(8, Answers.Q20ProductOf(new int[] { 2, 2, 2 }));
    }
}
